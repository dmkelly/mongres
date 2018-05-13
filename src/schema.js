const Types = require('./types');
const { isUndefined } = require('./utils');
const Middleware = require('./middleware');
const Virtual = require('./virtual');

class Schema {
  constructor (fields) {
    this.fields = fields;
    this.methods = {};
    this.statics = {};
    this.middleware = {
      pre: [],
      post: []
    };
    this.virtuals = new Map();
  }

  cast (data) {
    if (!data) {
      return {};
    }

    return Object.keys(this.fields).reduce((cleaned, fieldName) => {
      const field = this.fields[fieldName];
      let value = data[fieldName];
      if (value == null) {
        return cleaned;
      }
      value = field.type.cast(value);
      if (!isUndefined(value)) {
        cleaned[fieldName] = value;
      }
      return cleaned;
    }, {});
  }

  pre (hook, callback) {
    this.middleware.pre.push(new Middleware(hook, callback));
  }

  post (hook, callback) {
    this.middleware.post.push(new Middleware(hook, callback));
  }

  virtual (name) {
    if (name == null) {
      throw new Error('Schema virtuals require a name');
    }

    const virt = this.virtuals.get(name) || new Virtual(name);
    this.virtuals.set(name, virt);
    return virt;
  }
}

Schema.Types = Types;

module.exports = Schema;
