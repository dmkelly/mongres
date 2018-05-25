const Constraint = require('./constraint');
const { getConstraints } = require('../describe');
const { getRef } = require('../field');

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
    return await hasForeignKey(this.Model, this.field.columnName);
  }

  create (table) {
    const Ref = getRef(this.field);
    const isNested = Object.values(Ref.schema.fields)
      .some((field) => field.isNested && field.type === this.Model);

    let operation = table.foreign(this.field.columnName)
      .references(`${this.field.refTableName}.id`);

    if (isNested) {
      operation = operation.onDelete('CASCADE').onUpdate('CASCADE');
    }

    return operation;
  }
}

module.exports = Ref;
