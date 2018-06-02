const Constraint = require('./constraint');
const { getConstraints } = require('../describe');

async function hasForeignKey (Model, columnName) {
  const constraints = await getConstraints(Model.instance, Model.tableName);
  const name = [
    Model.tableName,
    columnName,
    Model.discriminatorKey,
    'foreign'
  ].join('_');
  const foreignKey = constraints.find((c) => {
    return c.constraint_type === 'FOREIGN KEY'
      && c.table_name === Model.tableName
      && c.constraint_name === name;
  });

  return !!foreignKey;
}

class SubClass extends Constraint {
  async exists () {
    return await hasForeignKey(this.Model, this.field.columnName);
  }

  create (table) {
    table.unique([this.field.columnName, this.Model.discriminatorKey]);

    table.foreign([this.field.columnName, this.Model.discriminatorKey])
      .references(['id', this.Model.discriminatorKey])
      .on(this.Model.Parent.tableName)
      .onDelete('CASCADE')
      .onUpdate('CASCADE');

  }
}

module.exports = SubClass;
