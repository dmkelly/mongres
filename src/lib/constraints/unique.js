const Constraint = require('./constraint');
const { getConstraints } = require('../describe');
const { sanitizeName } = require('../../utils');

class Unique extends Constraint {
  async exists() {
    const { instance, tableName } = this.Model;
    const columnName = sanitizeName(this.field.columnName);
    const constraintName = `${tableName}_${columnName}_unique`;
    const constraints = await getConstraints(instance, tableName);
    const constraint = constraints.find(c => {
      return (
        c.constraint_type === 'UNIQUE' &&
        c.table_name === tableName &&
        c.constraint_name === constraintName
      );
    });

    return !!constraint;
  }

  create(table) {
    return table.unique([this.field.columnName]);
  }
}

module.exports = Unique;
