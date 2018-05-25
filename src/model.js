const { invoke, invokeSeries, isUndefined } = require('./utils');
const { getBackRefFields, serialize } = require('./lib/model');

async function invokeMiddleware (document, hook, middleware, isBlocking) {
  const fns = middleware.map(mid => () => mid.execute(hook, document));
  if (isBlocking) {
    return await invokeSeries(fns);
  }
  return invoke(fns);
}

async function saveNestedFields (transaction, document) {
  const fields = Object.values(document.schema.fields);
  for (let field of fields) {
    if (field.isNested) {
      const values = document[field.fieldName];
      const backRefFields = getBackRefFields(document.Model, field.type.schema);

      await Promise.all(values.map((nestedDoc) => {
        backRefFields.forEach((backRefField) => {
          nestedDoc[backRefField.fieldName] = backRefField.cast(document.id);
        });
        return nestedDoc.save({ transaction });
      }));
    }
  }
}

async function upsert (transaction, document) {
  const data = serialize(document);

  if (document.isNew) {
    document.id = await transaction.insert(data)
      .into(document.Model.tableName)
      .returning('id');
    document.isNew = false;
  } else {
    await document.Model.update({
      id: document.id
    }, data, { transaction });
  }

  await saveNestedFields(transaction, document);
}

class Model {
  constructor () {
    this.isNew = true;
  }

  toObject () {
    return Object.values(this.schema.fields)
      .reduce((data, field) => {
        const fieldName = field.fieldName;
        if (field.isNested) {
          data[fieldName] = this[fieldName].map((item) => item.toObject());
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

  async populate (fieldName) {
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

  async remove () {
    const { pre, post } = this.schema.middleware;
    const hook = 'remove';

    await invokeMiddleware(this, hook, pre, true);

    if (this.isNew && isUndefined(this.id)) {
      invokeMiddleware(this, hook, post, false);
      return await null;
    }

    await this.Model.remove({
      id: this.id
    });

    invokeMiddleware(this, hook, post, false);

    return null;
  }

  async save ({ transaction } = {}) {
    const { pre, post } = this.schema.middleware;
    const hook = 'save';

    await this.validate();
    await invokeMiddleware(this, hook, pre, true);

    const client = this.instance.client;

    if (transaction) {
      await upsert(transaction, this);
    } else {
      await client.transaction((trx) => upsert(trx, this));
    }

    invokeMiddleware(this, hook, post, false);

    return this;
  }

  async validate () {
    const { pre, post } = this.schema.middleware;
    const hook = 'validate';

    await invokeMiddleware(this, hook, pre, true);
    this.schema.validate(this);
    invokeMiddleware(this, hook, post, false);
  }
}

module.exports = Model;
