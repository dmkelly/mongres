const MultiField = require('./multiField');
const { getConstraints } = require('../describe');

class MultiUnique extends MultiField {
  async exists() {
    const { instance, tableName } = this.Model;
    const constraints = await getConstraints(instance, tableName);
    const name = `${tableName}_${this.fieldNames.join('_')}_unique`;
    const constraint = constraints.find(c => {
      return (
        c.constraint_type === 'UNIQUE' &&
        c.table_name === tableName &&
        c.constraint_name === name
      );
    });

    return !!constraint;
  }

  create(table) {
    table.unique(this.fieldNames);
  }
}

module.exports = MultiUnique;
