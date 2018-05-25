const Types = require('./types');
const { isNil, isUndefined } = require('./utils');
const Field = require('./field');
const Middleware = require('./middleware');
const Virtual = require('./virtual');
const { ValidationError } = require('./error');

class Schema {
  constructor (fields, options) {
    this.fields = Object.entries(fields)
      .reduce((lookup, [fieldName, definition]) => {
        lookup[fieldName] = new Field(this, fieldName, definition);
        return lookup;
      }, {});
    this.options = options;
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

    return Object.keys(this.fields)
      .reduce((cleaned, fieldName) => {
        const field = this.fields[fieldName];
        let value = data[fieldName];
        if (isNil(value)) {
          return cleaned;
        }
        value = field.cast(value);
        if (!isUndefined(value)) {
          cleaned[fieldName] = value;
        }
        return cleaned;
      }, {});
  }

  pre (hook, callback) {
    this.middleware.pre.push(new Middleware(hook, callback));
    return this;
  }

  post (hook, callback) {
    this.middleware.post.push(new Middleware(hook, callback));
    return this;
  }

  validate (data) {
    const errors = Object.keys(this.fields)
      .reduce((errors, fieldName) => {
        const field = this.fields[fieldName];
        const value = data[fieldName];
        try {
          field.validate(value);
        } catch (err) {
          if (err instanceof ValidationError) {
            errors.push(err);
            return errors;
          }
          throw err;
        }
        return errors;
      }, []);

    if (errors.length) {
      throw new ValidationError('Validation Error', errors);
    }
  }

  virtual (name) {
    if (isNil(name)) {
      throw new Error('Schema virtuals require a name');
    }

    const virt = this.virtuals.get(name) || new Virtual(name);
    this.virtuals.set(name, virt);
    return virt;
  }
}

Schema.Types = Types;

module.exports = Schema;
