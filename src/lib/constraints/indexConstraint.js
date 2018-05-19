const Constraint = require('./constraint');
const { getIndexes } = require('../describe');
const { isString } = require('../../utils');

class Index extends Constraint {
  async exists () {
    const { instance, tableName } = this.Model;
    const indexes = await getIndexes(instance, tableName);
    const index = indexes.find((index) => {
      return index.table_name === tableName
        && index.column_name === this.columnName;
    });

    return !!index;
  }

  async create (table) {
    if (isString(this.field.index)) {
      return table.index([this.columnName], null, this.field.index);
    }
    return table.index([this.columnName]);
  }
}

module.exports = Index;
