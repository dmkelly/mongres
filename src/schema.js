const Types = require('./types');
const { isUndefined } = require('./utils');
const Middleware = require('./middleware');
const Virtual = require('./virtual');
const { ValidationError } = require('./error');

function validateField (fieldName, field, value) {
  if (value == null) {
    if (field.required) {
      throw new ValidationError(`Field ${fieldName} is required`, {
        field: fieldName
      });
    }
    return;
  }
  if (!field.type.isValid(value)) {
    throw new ValidationError(`Invalid value of field ${fieldName}: ${value}`, {
      field: fieldName,
      value
    });
  }
}

class Schema {
  constructor (fields, options) {
    this.fields = fields;
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

  validate (data) {
    const errors = Object.keys(this.fields).reduce((errors, key) => {
      try {
        validateField(key, this.fields[key], data[key]);
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
