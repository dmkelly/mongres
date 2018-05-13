class Type {
  constructor () {
    this.dataType = null;
  }

  cast (value) {
    return `${value}`;
  }

  defineColumn (table, columnName) {
    // http://knexjs.org/#Schema-Building
    return table.string(columnName);
  }

  isValid (/* value */) {
  }
}

module.exports = Type;
