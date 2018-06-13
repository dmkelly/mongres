const Constraint = require('./constraint');
const { getConstraints } = require('../describe');
const { getRef } = require('../field');
const { sanitizeName } = require('../../utils');

class Ref extends Constraint {
  async exists() {
    const Model = this.Model;
    const columnName = sanitizeName(this.field.columnName);
    const constraints = await getConstraints(Model.instance, Model.tableName);
    const constraintName = `${Model.tableName}_${columnName}_foreign`;
    const foreignKey = constraints.find(c => {
      return (
        c.constraint_type === 'FOREIGN KEY' &&
        c.table_name === Model.tableName &&
        c.constraint_name === constraintName
      );
    });

    return !!foreignKey;
  }

  create(table) {
    const Ref = getRef(this.field);
    const isNested = Object.values(Ref.schema.fields).some(
      field => field.isNested && field.type === this.Model
    );

    let operation = table
      .foreign(this.field.columnName)
      .references(`${this.field.refTableName}.id`);

    if (isNested) {
      operation = operation.onDelete('CASCADE').onUpdate('CASCADE');
    }

    return operation;
  }
}

module.exports = Ref;
