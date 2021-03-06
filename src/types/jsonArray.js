const { deepEquals, isNil } = require('../utils');
const Type = require('./type');

class JsonArray extends Type {
  constructor(type) {
    super();
    this.type = type;
    this.dataType = `${this.type ? this.type.dataType : 'Any'}[]`;
  }

  cast(value) {
    if (isNil(value)) {
      return;
    }
    if (!Array.isArray(value)) {
      return;
    }
    if (!this.type) {
      return value;
    }
    return value.map(item => this.type.cast(item));
  }

  defineColumn(table, columnName) {
    return table.jsonb(columnName);
  }

  isEqual(value1, value2) {
    return deepEquals(value1, value2);
  }

  isValid(value) {
    if (isNil(value)) {
      return true;
    }
    if (!Array.isArray(value)) {
      return false;
    }
    if (!this.type) {
      return true;
    }
    const hasInvalidItem = value.some(item => !this.type.isValid(item));
    return !hasInvalidItem;
  }

  serialize(value) {
    return JSON.stringify(value);
  }
}

module.exports = JsonArray;
