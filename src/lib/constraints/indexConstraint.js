const Constraint = require('./constraint');
const { getIndexes } = require('../describe');

class Index extends Constraint {
  async exists() {
    const { instance, tableName } = this.Model;
    const indexes = await getIndexes(instance, tableName);
    const index = indexes.find(index => {
      return (
        index.table_name.toLowerCase() === tableName.toLowerCase() &&
        index.column_name.toLowerCase() === this.field.columnName.toLowerCase()
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
