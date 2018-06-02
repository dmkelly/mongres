const Types = require('./types');
const { isNil, isUndefined } = require('./utils');
const Field = require('./field');
const Middleware = require('./middleware');
const Modifier = require('./modifier');
const Virtual = require('./virtual');
const { ValidationError } = require('./error');

class Schema {
  constructor (fields, options = {}) {
    if (!fields.id) {
      fields.id = {
        type: Types.Id()
      };
    }
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
    this.modifiers = new Map();
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

  extend (...schemas) {
    const existingDefinitions = Object.keys(this.fields)
      .reduce((definitions, key) => {
        const field = this.fields[key];
        definitions[key] = field.definition;
        return definitions;
      }, {});

    const schema = new Schema(Object.assign(
      {},
      existingDefinitions,
      ...schemas.map(schema => schema.toFields())
    ));

    schema.middleware = [this, ...schemas].reduce((middleware, schema) => {
      middleware.pre = middleware.pre.concat(schema.middleware.pre.slice());
      middleware.post = middleware.post.concat(schema.middleware.post.slice());
      return middleware;
    }, schema.middleware);
    schema.methods = Object.assign({}, this.methods);
    schema.statics = Object.assign({}, this.statics);
    schema.virtuals = new Map(this.virtuals);

    return schema;
  }

  path (fieldName) {
    const modifier = new Modifier(fieldName);
    this.modifiers.set(fieldName, modifier);
    return modifier;
  }

  pre (hook, callback) {
    this.middleware.pre.push(new Middleware(hook, callback));
    return this;
  }

  post (hook, callback) {
    this.middleware.post.push(new Middleware(hook, callback));
    return this;
  }

  toFields () {
    return Object.entries(this.fields)
      .reduce((definition, [fieldName, field]) => {
        definition[fieldName] = field.definition;
        return definition;
      }, {});
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
