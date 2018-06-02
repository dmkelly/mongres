const { isNil } = require('../utils');
const Type = require('./type');

class Float extends Type {
  constructor (precision, scale) {
    super();
    this.dataType = 'float';
    this.precision = precision;
    this.scale = scale;
  }

  cast (value) {
    if (isNil(value)) {
      return;
    }
    const parsed = parseFloat(value);
    if (isNaN(parsed)) {
      return;
    }
    return parsed;
  }

  defineColumn (table, columnName) {
    return table.float(columnName, this.precision, this.scale);
  }

  isValid (value) {
    if (isNil(value)) {
      return true;
    }
    return !isNaN(parseFloat(value));
  }
}

module.exports = Float;
