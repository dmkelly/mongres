const MultiField = require('./multiField');
const { getConstraints } = require('../describe');
const { sanitizeName } = require('../../utils');

class MultiUnique extends MultiField {
  async exists() {
    const { instance, tableName } = this.Model;
    const constraints = await getConstraints(instance, tableName);
    const columnNames = this.fieldNames.map(sanitizeName);
    const name = `${tableName}_${columnNames.join('_')}_unique`;
    const constraint = constraints.find(c => {
      return (
        c.constraint_type === 'UNIQUE' &&
        c.table_name.toLowerCase() === tableName.toLowerCase() &&
        c.constraint_name.toLowerCase() === name.toLowerCase()
      );
    });

    return !!constraint;
  }

  create(table) {
    table.unique(this.fieldNames);
  }
}

module.exports = MultiUnique;
