const Types = require('./types');
const { isUndefined } = require('./utils');

class Schema {
  constructor (fields) {
    this.fields = fields;
  }

  cast (data = {}) {
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
}

Schema.Types = Types;

module.exports = Schema;
