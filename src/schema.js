const Types = require('./types');
const { isUndefined } = require('./utils');
const Virtual = require('./virtual');

class Schema {
  constructor (fields) {
    this.fields = fields;
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
