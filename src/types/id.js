const Integer = require('./integer');

class Id extends Integer {
  constructor (...args) {
    super(...args);
    this.dataType = 'integer';
  }

  defineColumn (table, columnName) {
    return table.increments(columnName);
  }
}

module.exports = Id;
