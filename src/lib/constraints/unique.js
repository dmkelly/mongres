const Constraint = require('./constraint');
const { getConstraints } = require('../describe');

class Unique extends Constraint {
  async exists () {
    const { instance, tableName } = this.Model;
    const constraints = await getConstraints(instance, tableName);
    const constraint = constraints.find((c) => {
      return c.constraint_type === 'UNIQUE'
        && c.table_name === tableName
        && c.constraint_name === `${tableName}_${this.columnName}_unique`;
    });

    return !!constraint;
  }

  create (table) {
    return table.unique([this.columnName]);
  }
}

module.exports = Unique;
