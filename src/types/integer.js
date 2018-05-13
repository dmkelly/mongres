const Type = require('./type');

class Integer extends Type {
  constructor () {
    super();
    this.dataType = 'integer';
  }

  cast (value) {
    const integer = parseInt(value, 10);
    if (isNaN(integer)) {
      return;
    }
    return integer;
  }

  defineColumn (table, columnName) {
    return table.integer(columnName);
  }

  isValid (value) {
    return !isNaN(value);
  }
}

module.exports = Integer;
