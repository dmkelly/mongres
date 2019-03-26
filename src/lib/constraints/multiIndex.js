const MultiField = require('./multiField');
const { getIndexes } = require('../describe');

class MultiIndex extends MultiField {
  async exists() {
    const { instance, tableName } = this.Model;
    const indexes = await getIndexes(instance, tableName);
    const name = `${tableName}_${this.fieldNames.join('_')}_index`;
    const index = indexes.find(i => {
      return (
        i.table_name.toLowerCase() === tableName.toLowerCase() &&
        i.index_name.toLowerCase() === name.toLowerCase()
      );
    });

    return Boolean(index);
  }

  create(table) {
    table.index(this.fieldNames);
  }
}

module.exports = MultiIndex;
