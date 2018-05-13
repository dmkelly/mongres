const hooks = ['save', 'validate'];

class Middleware {
  constructor (hook, callback) {
    if (!hooks.includes(hook)) {
      throw new Error(`Invalid middleware hook "${hook}"`);
    }
    this.hook = hook;
    this.callback = callback;
  }

  shouldExecuteOnHook (hook) {
    return this.hook === hook;
  }

  async execute (hook, context) {
    if (this.shouldExecuteOnHook(hook)) {
      await this.callback.call(context);
    }
  }
}

module.exports = Middleware;
