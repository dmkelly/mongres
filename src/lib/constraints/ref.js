const Constraint = require('./constraint');
const { getConstraints } = require('../describe');
const { sanitizeName } = require('../../utils');

async function hasForeignKey (Model, columnName) {
  const constraints = await getConstraints(Model.instance, Model.tableName);
  const foreignKey = constraints.find((c) => {
    return c.constraint_type === 'FOREIGN KEY'
      && c.table_name === Model.tableName
      && c.constraint_name === `${Model.tableName}_${columnName}_foreign`;
  });

  return !!foreignKey;
}

class Ref extends Constraint {
  async exists () {
    return await hasForeignKey(this.Model, this.columnName);
  }

  create (table) {
    return table.foreign(this.columnName)
      .references(`${sanitizeName(this.field.ref)}.id`);
  }
}

module.exports = Ref;
