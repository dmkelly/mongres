const { invoke, invokeSeries, isUndefined } = require('./utils');

async function invokeMiddleware (document, hook, middleware, isBlocking) {
  const fns = middleware.map(mid => () => mid.execute(hook, document));
  if (isBlocking) {
    return await invokeSeries(fns);
  }
  return invoke(fns);
}

function serialize (document) {
  const { instance, schema } = document;
  const data = Object.keys(schema.fields)
    .reduce((data, fieldName) => {
      const field = schema.fields[fieldName];
      const value = document[fieldName];

      if (field.ref) {
        const Ref = instance.model(field.ref);
        if (Ref && value instanceof Ref) {
          data[fieldName] = value.id;
          return data;
        }
      }

      data[fieldName] = value;
      return data;
    }, {});
  return data;
}

class Model {
  constructor () {
    this.isNew = true;
  }

  toObject () {
    return Object.assign({}, this.data);
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

  async save () {
    const { pre, post } = this.schema.middleware;
    const hook = 'save';

    await this.validate();
    await invokeMiddleware(this, hook, pre, true);

    if (this.isNew) {
      const client = this.instance.client;
      this.id = await client(this.Model.tableName)
        .insert(serialize(this))
        .returning('id');
      this.isNew = false;
      invokeMiddleware(this, hook, post, false);
      return this;
    }

    await this.Model.update({
      id: this.id
    }, serialize(this));
    invokeMiddleware(this, hook, post, false);
    return this;
  }

  async validate () {
    const { pre, post } = this.schema.middleware;
    const hook = 'validate';

    await invokeMiddleware(this, hook, pre, true);
    this.schema.validate(serialize(this));
    invokeMiddleware(this, hook, post, false);
  }
}

module.exports = Model;
