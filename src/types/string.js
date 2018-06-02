const { isNil, isObject } = require('../utils');
const Type = require('./type');

class String extends Type {
  constructor (size) {
    super();
    this.dataType = 'string';
    this.size = size;
  }

  cast (value) {
    if (isNil(value)) {
      return;
    }
    if (isObject(value)) {
      return JSON.stringify(value);
    }
    return `${value}`;
  }

  defineColumn (table, columnName) {
    return table.string(columnName, this.size);
  }

  isValid (value) {
    value = this.cast(value);
    if (isNil(value)) {
      return true;
    }
    if (isNil(this.size)) {
      return true;
    }
    return value.length <= this.size;
  }
}

module.exports = String;
