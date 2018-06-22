const Constraint = require('./constraint');
const Model = require('../../model');
const { getConstraints } = require('../describe');
const { getRef } = require('../field');
const { sanitizeName } = require('../../utils');

async function existsBasic(Model, field) {
  const columnName = sanitizeName(field.columnName);
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

function createBasic(table, Model, field, Ref) {
  const isNested = Object.values(Ref.schema.fields).some(
    field => field.isNested && field.type === Model
  );

  let operation = table
    .foreign(field.columnName)
    .references(`${field.refTableName}.id`);

  if (isNested) {
    operation = operation.onDelete('CASCADE').onUpdate('CASCADE');
  }

  return operation;
}

class Ref extends Constraint {
  constructor(...args) {
    super(...args);

    this.Ref = getRef(this.field);

    // basic
    // - one-to-one
    //    - field is not multi
    //    - no back ref field
    // - nested
    //   - field is multi with no ref
    //   - back ref field
    // complicated - create a nested schema for the field
    // - field is multi with ref
    // - type is not Model
    this.isBasic =
      !this.field.isMulti ||
      (this.field.isNested && this.field.type instanceof Model);
    this.isMany = this.field.isMulti && this.field.ref;
  }

  async exists() {
    if (this.isBasic) {
      return await existsBasic(this.Model, this.field);
    }
    if (this.isMany) {
      // This is handled by the create tables process
      return await true;
    }
    throw await new Error('Bad Ref definition');
  }

  create(table) {
    if (this.isBasic) {
      return createBasic(table, this.Model, this.field, this.Ref);
    }
    if (this.isMany) {
      // This is handled by the create constraints process
      return;
    }
    throw new Error('Bad Ref definition');
  }
}

module.exports = Ref;
