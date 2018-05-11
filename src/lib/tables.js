function sanitizeName (name) {
  return name.trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_');
}

function defineField (table, fieldName, field) {
  const columnName = sanitizeName(fieldName);
  field.type.defineColumn(table, columnName);
}

function defineTable (table, schema) {
  table.increments();

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

async function createTables (instance) {
  for (let Model of instance.models.values()) {
    await createTable(instance, Model);
  }
}

module.exports = {
  createTables,
  sanitizeName
};
