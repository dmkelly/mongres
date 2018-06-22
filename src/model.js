const Schema = require('./schema');
const { cloneDeep, invoke, invokeSeries, isUndefined } = require('./utils');
const { getBackRefFields, serialize } = require('./lib/model');

async function invokeMiddleware(document, hook, middleware, isBlocking) {
  const fns = middleware.map(mid => () => mid.execute(hook, document));
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
    parentDocument.isNew = document.isNew;
    await parentDocument.save({ transaction });
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
  }

  isModified(fieldName) {
    const field = this.schema.fields[fieldName];
    if (!field) {
      return false;
    }
    if (this.isNew) {
      return true;
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
        } else if (!isUndefined(value)) {
          data[fieldName] = value;
        }
      }
      return data;
    }, {});
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

  async remove({ transaction } = {}) {
    const { pre, post } = this.schema.middleware;
    const hook = 'remove';

    await invokeMiddleware(this, hook, pre, true);

    if (this.isNew && isUndefined(this.id)) {
      invokeMiddleware(this, hook, post, false);
      return await null;
    }

    await this.Model.remove(
      {
        id: this.id
      },
      { transaction }
    );

    invokeMiddleware(this, hook, post, false);

    return null;
  }

  async save({ transaction } = {}) {
    const { pre, post } = this.schema.middleware;
    const hook = 'save';

    await this.validate();
    await invokeMiddleware(this, hook, pre, true);

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

    invokeMiddleware(this, hook, post, false);

    return this;
  }

  async validate() {
    const { pre, post } = this.schema.middleware;
    const hook = 'validate';

    await invokeMiddleware(this, hook, pre, true);
    this.schema.validate(this);
    invokeMiddleware(this, hook, post, false);
  }
}

Model.schema = defaultSchema;

module.exports = Model;
