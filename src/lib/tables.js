const constraintDescriptions = require('./constraints');
const SubClassConstraint = require('./constraints/subClass');
const MultiUniqueConstraint = require('./constraints/multiUnique');
const Field = require('../field');
const Types = require('../types');
const { getConstraints: fetchExistingConstraints } = require('./describe');
const { getRelationTableName, sanitizeName } = require('../utils');

function getConstraintForAttribute(attributeName, field) {
  if (field.isMulti && field.ref) {
    return null;
  }
  return constraintDescriptions[attributeName];
}

function defineField(table, fieldName, field) {
  if (!field.isMulti) {
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
  const tableExists = await instance.dbSchema.hasTable(Model.tableName);

  if (!tableExists) {
    await instance.dbSchema.createTable(Model.tableName, function(table) {
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
      const Constraint = getConstraintForAttribute(attributeKey, field);
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

function getManyRelations(instance, Model) {
  return Object.values(Model.schema.fields).reduce((relations, field) => {
    if (field.isMulti && field.ref) {
      relations.push([Model, instance.model(field.ref)]);
    }
    return relations;
  }, []);
}

async function createRelation(instance, relation) {
  const tableName = getRelationTableName(relation);
  const tableExists = await instance.dbSchema.hasTable(tableName);

  if (!tableExists) {
    await instance.dbSchema.createTable(tableName, function(table) {
      relation.forEach(Model => {
        table.integer(Model.tableName);
      });
    });
  }
}

async function relationConstraintExists(instance, relation) {
  const tableName = getRelationTableName(relation);
  const constraints = await fetchExistingConstraints(instance, tableName);
  const constraintName = [
    tableName,
    sanitizeName(relation[0].tableName),
    'foreign'
  ].join('_');

  return constraints.some(
    constraint =>
      constraint.table_name === tableName &&
      constraint.constraint_type === 'FOREIGN KEY' &&
      constraint.constraint_name === constraintName
  );
}

async function createRelationConstraints(instance, relation) {
  const exists = await relationConstraintExists(instance, relation);
  if (exists) {
    return;
  }
  const tableName = getRelationTableName(relation);
  const linkedTableNames = relation.map(Model => Model.tableName);
  linkedTableNames.sort();
  const [tableA, tableB] = linkedTableNames;

  await instance.dbSchema.alterTable(tableName, table => {
    table.primary(linkedTableNames);
    table
      .foreign(tableA)
      .references(`${tableA}.id`)
      .onDelete('CASCADE')
      .onUpdate('CASCADE');
    table
      .foreign(tableB)
      .references(`${tableB}.id`)
      .onDelete('CASCADE')
      .onUpdate('CASCADE');
  });
}

async function createTables(instance) {
  for (let Model of instance.models.values()) {
    await createTable(instance, Model);

    const manyRelations = getManyRelations(instance, Model);
    if (manyRelations.length) {
      for (let relation of manyRelations) {
        await createRelation(instance, relation);
      }
    }
  }

  for (let Model of instance.models.values()) {
    await createTableConstraints(instance, Model);

    const manyRelations = getManyRelations(instance, Model);
    if (manyRelations.length) {
      for (let relation of manyRelations) {
        await createRelationConstraints(instance, relation);
      }
    }
  }
}

module.exports = {
  createTables
};
