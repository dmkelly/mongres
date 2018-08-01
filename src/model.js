const { isConflictError, ConflictError } = require('./error');
const Schema = require('./schema');
const {
  cloneDeep,
  getRelationTableName,
  invoke,
  invokeSeries,
  isFunction,
  isNil,
  isUndefined
} = require('./utils');
const { getBackRefFields, serialize } = require('./lib/model');

async function invokeMiddleware(document, hook, middleware, isBlocking, tx) {
  const fns = middleware.map(mid => () => mid.execute(hook, document, tx));
  if (isBlocking) {
    return await invokeSeries(fns);
  }
  return invoke(fns);
}

async function saveNestedFields(transaction, document) {
  const fields = Object.values(document.subSchema.fields);
  for (let field of fields) {
    if (field.isNested) {
      const values = document[field.fieldName];
      const backRefFields = getBackRefFields(document.Model, field.type.schema);

      return Promise.all(
        values.map(nestedDoc => {
          backRefFields.forEach(backRefField => {
            nestedDoc[backRefField.fieldName] = backRefField.cast(document.id);
          });
          return nestedDoc.save({ transaction });
        })
      );
    }
  }
}

async function upsert(transaction, document) {
  if (document.Parent) {
    const parentDocument = new document.Parent(document.toObject());

    if (document.isNew) {
      parentDocument.isNew = true;
    } else {
      parentDocument.isNew = false;
      parentDocument.originalData = document.Parent.schema.cast(document.data);
    }

    await parentDocument.save({
      transaction,
      skipMiddleware: true
    });
    document[document.Parent.tableName] = parentDocument.id;
    document.id = parentDocument.id;
  }

  const data = serialize(document, document.subSchema);
  if (document.isNew) {
    document.id = await transaction
      .insert(data)
      .into(document.Model.tableName)
      .returning('id');
    document.isNew = false;
  } else {
    await document.Model.update(
      {
        id: document.id
      },
      data,
      { transaction }
    );
  }

  await saveNestedFields(transaction, document);
}

const defaultSchema = new Schema({});

class Model {
  constructor() {
    this.isNew = true;
    this.schema = defaultSchema;
    this.subSchema = defaultSchema;
    this.originalData = {};
  }

  isModified(fieldName) {
    const field = this.schema.fields[fieldName];
    if (!field) {
      return false;
    }

    const originalValue = this.originalData[fieldName];
    const currentValue = this.data[fieldName];

    return !field.type.isEqual(originalValue, currentValue);
  }

  toObject() {
    return Object.values(this.schema.fields).reduce((data, field) => {
      const fieldName = field.fieldName;
      if (Array.isArray(this[fieldName])) {
        data[fieldName] = Array.from(
          this[fieldName].map(item => {
            return isFunction(item.toObject) ? item.toObject() : item;
          })
        );
      } else {
        const value = this[fieldName];
        if (value instanceof Model) {
          data[fieldName] = value.toObject();
        } else if (!isNil(value)) {
          data[fieldName] = value;
        }
      }
      return data;
    }, {});
  }

  async associate(fieldName, document) {
    const field = this.schema.fields[fieldName];
    if (!field) {
      throw await new Error(
        `Field ${fieldName} does not exist on ${this.Model.modelName}`
      );
    }
    if (!field.isMulti || !field.ref) {
      throw await new Error(`Field ${fieldName} does not support associations`);
    }

    const relation = [this.Model, field.type];
    const tableName = getRelationTableName(relation);

    let foreignId = document instanceof Model ? document.id : document;

    try {
      await this.instance.client
        .insert([
          {
            [this.Model.tableName]: this.id,
            [field.type.tableName]: foreignId
          }
        ])
        .into(tableName);
    } catch (err) {
      if (isConflictError(err)) {
        return;
      }
      throw err;
    }
  }

  async dissociate(fieldName, document) {
    const field = this.schema.fields[fieldName];
    if (!field) {
      throw await new Error(
        `Field ${fieldName} does not exist on ${this.Model.modelName}`
      );
    }
    if (!field.isMulti || !field.ref) {
      throw await new Error(`Field ${fieldName} does not support associations`);
    }

    const relation = [this.Model, field.type];
    const tableName = getRelationTableName(relation);

    let foreignId = document instanceof Model ? document.id : document;

    await this.instance
      .client(tableName)
      .where({
        [this.Model.tableName]: this.id,
        [field.type.tableName]: foreignId
      })
      .del();
  }

  async populate(fieldName) {
    const field = this.schema.fields[fieldName];
    if (!field || !field.ref) {
      throw await new Error(
        `Field ${field.fieldName} does not support populate`
      );
    }

    if (this[field.fieldName] == null) {
      return await this;
    }

    const Ref = this.instance.model(field.ref);
    if (!Ref) {
      return await this;
    }

    const record = await Ref.findById(this[fieldName]);
    if (record) {
      this[fieldName] = record;
    }
    return this;
  }

  async remove({ transaction, skipMiddleware } = {}) {
    const { pre, post } = this.schema.middleware;
    const hook = 'remove';

    if (!skipMiddleware) {
      await invokeMiddleware(this, hook, pre, true, transaction);
    }

    if (this.isNew && isUndefined(this.id)) {
      if (!skipMiddleware) {
        invokeMiddleware(this, hook, post, true, transaction);
      }
      return await null;
    }

    await this.Model.remove(
      {
        id: this.id
      },
      { transaction }
    );

    if (!skipMiddleware) {
      invokeMiddleware(this, hook, post, true, transaction);
    }

    return null;
  }

  async save({ transaction, skipMiddleware } = {}) {
    const { pre, post } = this.schema.middleware;
    const hook = 'save';
    const isCreating = this.isNew;

    await this.validate({ skipMiddleware });

    if (!skipMiddleware) {
      if (isCreating) {
        await invokeMiddleware(this, 'create', pre, true, transaction);
      }
      await invokeMiddleware(this, hook, pre, true, transaction);
    }

    const client = this.instance.client;

    if (this.Parent) {
      this[this.Parent.tableName] = this.id;
    }

    try {
      if (transaction) {
        await upsert(transaction, this);
      } else {
        await client.transaction(trx => upsert(trx, this));
      }
    } catch (err) {
      if (isConflictError(err)) {
        throw new ConflictError(err);
      }
      throw err;
    }

    this.originalData = cloneDeep(this.data);

    if (!skipMiddleware) {
      if (isCreating) {
        await invokeMiddleware(this, 'create', post, true, transaction);
      }
      await invokeMiddleware(this, hook, post, true, transaction);
    }

    return this;
  }

  async validate({ skipMiddleware } = {}) {
    const { pre, post } = this.schema.middleware;
    const hook = 'validate';

    if (!skipMiddleware) {
      await invokeMiddleware(this, hook, pre, true);
    }

    this.schema.validate(this);

    if (!skipMiddleware) {
      invokeMiddleware(this, hook, post, false);
    }
  }
}

Model.schema = defaultSchema;

module.exports = Model;
