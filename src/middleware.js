const hooks = ['remove', 'save', 'validate'];

class Middleware {
  constructor(hook, callback) {
    if (!hooks.includes(hook)) {
      throw new Error(`Invalid middleware hook "${hook}"`);
    }
    this.hook = hook;
    this.callback = callback;
  }

  shouldExecuteOnHook(hook) {
    return this.hook === hook;
  }

  async execute(hook, context, transaction) {
    if (this.shouldExecuteOnHook(hook)) {
      return await this.callback.call(context, transaction);
    }
  }
}

module.exports = Middleware;
