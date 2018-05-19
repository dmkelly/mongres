const constraintDescriptions = require('./constraints');
const { sanitizeName } = require('../utils');

function defineField (table, fieldName, field) {
  const columnName = sanitizeName(fieldName);
  field.type.defineColumn(table, columnName);
}

function defineTable (table, schema) {
  Object.entries(schema.fields)
    .forEach(([fieldName, field]) => {
      defineField(table, fieldName, field);
    });
}

async function createTable (instance, Model) {
  const dbSchema = instance.namespace
    ? instance.client.schema.withSchema(instance.namespace)
    : instance.client.schema;
  const tableExists = await dbSchema.hasTable(Model.tableName);

  if (!tableExists) {
    await dbSchema.createTable(Model.tableName, function (table) {
      defineTable(table, Model.schema);
    });
  }
}

async function getConstraints (Model) {
  const constraints = [];
  const fieldPairs = Object.entries(Model.schema.fields);

  for (let i = 0; i < fieldPairs.length; i += 1) {
    const [fieldName, field] = fieldPairs[i];
    const attributeKeys = Object.keys(field);

    for (let j = 0; j < attributeKeys.length; j += 1) {
      const attributeKey = attributeKeys[j];
      const Constraint = constraintDescriptions[attributeKey];
      if (!Constraint) {
        continue;
      }

      const columnName = sanitizeName(fieldName);
      const constraint = new Constraint(Model, columnName, field);
      const constraintExists = await constraint.exists();
      if (!constraintExists) {
        constraints.push(constraint);
      }
    }
  }

  return constraints;
}

async function createTableConstraints (instance, Model) {
  const dbSchema = instance.namespace
    ? instance.client.schema.withSchema(instance.namespace)
    : instance.client.schema;

  const constraints = await getConstraints(Model);
  if (!constraints.length) {
    return;
  }

  await dbSchema.alterTable(Model.tableName, async (table) => {
    for (let i = 0; i < constraints.length; i += 1) {
      const constraint = constraints[i];
      await constraint.create(table);
    }
  });
}

async function createTables (instance) {
  for (let Model of instance.models.values()) {
    await createTable(instance, Model);
  }

  for (let Model of instance.models.values()) {
    await createTableConstraints(instance, Model);
  }
}

module.exports = {
  createTables,
  sanitizeName
};
