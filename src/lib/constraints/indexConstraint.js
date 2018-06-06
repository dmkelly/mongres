const Constraint = require('./constraint');
const { getIndexes } = require('../describe');

class Index extends Constraint {
  async exists() {
    const { instance, tableName } = this.Model;
    const indexes = await getIndexes(instance, tableName);
    const index = indexes.find(index => {
      return (
        index.table_name === tableName &&
        index.column_name === this.field.columnName
      );
    });

    return !!index;
  }

  async create(table) {
    const { columnName, indexType } = this.field;
    return table.index([columnName], null, indexType);
  }
}

module.exports = Index;
