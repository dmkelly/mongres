class Type {
  constructor () {
    this.dataType = null;
  }

  cast (value) {
    return `${value}`;
  }

  isEqual (value1, value2) {
    return value1 === value2;
  }

  defineColumn (table, columnName) {
    // http://knexjs.org/#Schema-Building
    return table.string(columnName);
  }

  isValid (/* value */) {
  }
}

module.exports = Type;
