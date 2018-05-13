const { invoke, invokeSeries, isUndefined } = require('./utils');

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
        .insert(this.data)
        .returning('id');
      this.isNew = false;
      invokeMiddleware(this, hook, post, false);
      return this;
    }

    await this.Model.update({
      id: this.id
    }, this.data);
    invokeMiddleware(this, hook, post, false);
    return this;
  }

  async validate () {
    const { pre, post } = this.schema.middleware;
    const hook = 'validate';

    await invokeMiddleware(this, hook, pre, true);
    this.schema.validate(this.data);
    invokeMiddleware(this, hook, post, false);
  }
}

module.exports = Model;
