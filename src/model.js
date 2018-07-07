const Schema = require('./schema');
const {
  cloneDeep,
  getRelationTableName,
  invoke,
  invokeSeries,
  isConflictError,
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
      if (field.isMulti) {
        data[fieldName] = this[fieldName].map(item => {
          if (item instanceof Model) {
            return item.toObject();
          }
          return item;
        });
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

    await this.validate({ skipMiddleware });
    if (!skipMiddleware) {
      await invokeMiddleware(this, hook, pre, true, transaction);
    }

    const client = this.instance.client;

    if (this.Parent) {
      this[this.Parent.tableName] = this.id;
    }

    if (transaction) {
      await upsert(transaction, this);
    } else {
      await client.transaction(trx => upsert(trx, this));
    }

    this.originalData = cloneDeep(this.data);

    if (!skipMiddleware) {
      invokeMiddleware(this, hook, post, true, transaction);
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
