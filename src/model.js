const { invoke, invokeSeries } = require('./utils');

async function invokeMiddleware (document, hook, middleware, isBlocking) {
  const fns = middleware.map(mid => () => mid.execute(hook, document));
  if (isBlocking) {
    return await invokeSeries(fns);
  }
  return invoke(fns);
}

class Model {
  constructor () {
    this.isNew = true;
  }

  toObject () {
    return Object.assign({}, this.data);
  }

  async save () {
    const { pre, post } = this.schema.middleware;

    await invokeMiddleware(this, 'save', pre, true);

    if (this.isNew) {
      const client = this.instance.client;
      this.id = await client(this.Model.tableName)
        .insert(this.data)
        .returning('id');
      this.isNew = false;
      invokeMiddleware(this, 'save', post, false);
      return this;
    }

    await this.Model.update({
      id: this.id
    }, this.data);
    invokeMiddleware(this, 'save', post, false);
    return this;
  }

  validate () {
    this.schema.validate(this.data);
  }
}

module.exports = Model;
