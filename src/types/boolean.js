const { isNil } = require('../utils');
const Type = require('./type');

class Boolean extends Type {
  constructor () {
    super();
    this.dataType = 'boolean';
  }

  cast (value) {
    if (isNil(value)) {
      return;
    }
    return !!value;
  }

  defineColumn (table, columnName) {
    return table.boolean(columnName);
  }

  isValid () {
    return true;
  }
}

module.exports = Boolean;
