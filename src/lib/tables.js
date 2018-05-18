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

function getConstraints (Model) {
  return Object.entries(Model.schema.fields)
    .reduce((constraints, [fieldName, field]) => {
      Object.keys(field)
        .forEach((descriptor) => {
          const constraint = constraintDescriptions[descriptor];
          if (constraint) {
            constraints.push((table) => constraint(
              table,
              sanitizeName(fieldName),
              field
            ));
          }
        });
      return constraints;
    }, []);
}

async function createTableConstraints (instance, Model) {
  const dbSchema = instance.namespace
    ? instance.client.schema.withSchema(instance.namespace)
    : instance.client.schema;

  const constraints = getConstraints(Model);
  if (!constraints.length) {
    return;
  }
  await dbSchema.alterTable(Model.tableName, (table) => {
    constraints.forEach(constraint => constraint(table));
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
