const Constraint = require('./constraint');
const { getConstraints } = require('../describe');
const { sanitizeName } = require('../../utils');
const MultiUnique = require('./multiUnique');

async function hasForeignKey(Model, columnName) {
  const constraints = await getConstraints(Model.instance, Model.tableName);
  const name = [
    Model.tableName,
    sanitizeName(columnName),
    sanitizeName(Model.discriminatorKey),
    'foreign'
  ].join('_');
  const foreignKey = constraints.find(c => {
    return (
      c.constraint_type === 'FOREIGN KEY' &&
      c.table_name.toLowerCase() === Model.tableName.toLowerCase() &&
      c.constraint_name.toLowerCase() === name.toLowerCase()
    );
  });

  return !!foreignKey;
}

async function hasUniqueConstraint(Model, fieldNames) {
  const constraint = new MultiUnique(Model, fieldNames);
  return await constraint.exists();
}

class SubClass extends Constraint {
  async exists() {
    const fields = [this.field.columnName, this.Model.discriminatorKey];
    this.foreignKeyExists = await hasForeignKey(
      this.Model,
      this.field.columnName
    );
    this.uniqueConstraintExists = await hasUniqueConstraint(this.Model, fields);
    return this.foreignKeyExists && this.uniqueConstraintExists;
  }

  create(table) {
    const fields = [this.field.columnName, this.Model.discriminatorKey];

    if (!this.uniqueConstraintExists) {
      table.unique(fields);
    }

    if (!this.foreignKeyExists) {
      table
        .foreign(fields)
        .references(['id', this.Model.discriminatorKey])
        .on(this.Model.Parent.tableName)
        .onDelete('CASCADE')
        .onUpdate('CASCADE');
    }
  }
}

module.exports = SubClass;
