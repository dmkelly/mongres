const constraintDescriptions = require('./constraints');
const SubClassConstraint = require('./constraints/subClass');
const MultiUniqueConstraint = require('./constraints/multiUnique');
const Field = require('../field');
const Types = require('../types');

function defineField(table, fieldName, field) {
  if (!field.isNested) {
    const columnName = fieldName;
    field.type.defineColumn(table, columnName);
  }
}

function defineTable(table, schema) {
  Object.entries(schema.fields).forEach(([fieldName, field]) => {
    defineField(table, fieldName, field);
  });
}

async function createTable(instance, Model) {
  const dbSchema = instance.namespace
    ? instance.client.schema.withSchema(instance.namespace)
    : instance.client.schema;
  const tableExists = await dbSchema.hasTable(Model.tableName);

  if (!tableExists) {
    await dbSchema.createTable(Model.tableName, function(table) {
      defineTable(table, Model.subSchema);
    });
  }
}

async function updateForeignKeys(instance) {
  const foreignKeys = await instance
    .client('pg_constraint')
    .select('*')
    .where('contype', '=', 'f');

  const queries = foreignKeys.map(async foreignKey => {
    const [keyData] = await instance
      .client('pg_class')
      .select('relname')
      .where('oid', '=', foreignKey.conrelid);

    const tableName = keyData.relname;
    return instance.dbSchema.raw(`
      ALTER TABLE "${tableName}"
      ALTER CONSTRAINT ${foreignKey.conname}
      DEFERRABLE INITIALLY DEFERRED;
    `);
  });

  await Promise.all(queries);
}

async function getConstraints(Model) {
  const constraints = [];
  const fields = Object.values(Model.subSchema.fields);

  for (let i = 0; i < fields.length; i += 1) {
    const field = fields[i];
    const attributes = field.getConstraints();
    const attributeKeys = Object.keys(attributes);

    for (let j = 0; j < attributeKeys.length; j += 1) {
      const attributeKey = attributeKeys[j];
      const Constraint = constraintDescriptions[attributeKey];
      if (!Constraint) {
        continue;
      }
      constraints.push(new Constraint(Model, field));
    }
  }

  if (Model.Parent) {
    const constraint = new SubClassConstraint(
      Model,
      new Field(Model.subSchema, Model.Parent.tableName, {
        type: Types.Integer()
      })
    );
    constraints.push(constraint);
  }

  if (Model.children.length) {
    const constraint = new MultiUniqueConstraint(Model, [
      'id',
      Model.discriminatorKey
    ]);
    constraints.push(constraint);
  }

  const multiFieldConstraints = Model.subSchema.indexes.map(index => {
    index.Model = Model;
    return index;
  });

  const allConstraints = constraints.concat(multiFieldConstraints);
  const newConstraints = [];
  for (let constraint of allConstraints) {
    const exists = await constraint.exists();
    if (!exists) {
      newConstraints.push(constraint);
    }
  }

  return newConstraints;
}

async function createTableConstraints(instance, Model) {
  const constraints = await getConstraints(Model);
  if (!constraints.length) {
    return;
  }

  await instance.dbSchema.alterTable(Model.tableName, table => {
    for (let constraint of constraints) {
      constraint.create(table);
    }
  });

  await updateForeignKeys(instance);
}

async function createTables(instance) {
  for (let Model of instance.models.values()) {
    await createTable(instance, Model);
  }

  for (let Model of instance.models.values()) {
    await createTableConstraints(instance, Model);
  }
}

module.exports = {
  createTables
};
