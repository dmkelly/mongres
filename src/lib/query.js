const {
  isNil,
  isNumber,
  isObject,
  isString,
  sanitizeName,
  setIn
} = require('../utils');
const filterMap = require('./filters');

function ensureColumnNamespace (field, Model) {
  let Parent = Model.Parent;

  if (!Parent) {
    return `${Model.tableName}.${field.columnName}`;
  }
  if (Model.subSchema.fields[field.fieldName]) {
    return `${Model.tableName}.${field.columnName}`;
  }
  while (Parent) {
    if (Parent.subSchema.fields[field.fieldName]) {
      return `${Parent.tableName}.${field.columnName}`;
    }
    Parent = Parent.Parent;
  }
  return null;
}

function getFieldsList (Model) {
  const baseFields = Object.values(Model.schema.fields)
    .map((field) => {
      if (field.isNested) {
        return null;
      }
      return ensureColumnNamespace(field, Model);
    })
    .filter(Boolean);

  if (!Model.children.length) {
    return baseFields;
  }

  const allFields = Model.children.reduce((fieldsList, Child) => {
    const childFields = Object.values(Child.subSchema.fields)
      .map((field) => {
        if (field.isNested) {
          return null;
        }
        return ensureColumnNamespace(field, Child);
      })
      .filter(Boolean);
    return fieldsList.concat(childFields);
  }, baseFields);

  return allFields;
}

function getTableModel (query, tableName, discriminator) {
  if (query.Model.children.length) {
    for (let Child of query.Model.children) {
      if (Child.tableName === tableName) {
        return Child;
      }
      if (discriminator && Child.modelName === discriminator) {
        return Child;
      }
    }
  }
  if (tableName === query.Model.tableName) {
    return query.Model;
  }
  if (query.joins[tableName]) {
    return query.joins[tableName].Model;
  }

  let Parent = query.Model.Parent;
  while (Parent) {
    if (Parent.tableName === tableName) {
      return Parent;
    }
    Parent = Parent.Parent;
  }

  return null; // should never hit this
}

function getWhereBuilder (query, fieldName, filter) {
  if (isNil(filter)) {
    return;
  }

  if (!isObject(filter)) {
    const [tableName, columnName] = fieldName.split('.');
    const Model = getTableModel(query, tableName);
    const field = Model.schema.fields[columnName];
    return (builder) => builder.where(fieldName, field.cast(filter));
  }

  return (builder) => {
    Object.entries(filter)
      .forEach((([key, value]) => {
        const filterFn = filterMap[key];
        if (filterFn) {
          filterFn(builder, fieldName, value);
        }
      }));
  };
}

function normalizeSortArgs (...args) {
  if (args.length === 1) {
    const param = args[0];
    if (param.startsWith('-')) {
      return [param.substr(1), 'desc'];
    }
    return [param, 'asc'];
  }
  if (args.length === 2) {
    return [args[0], parseSortDirection(args[1])];
  }
  return [];
}

function parseSortDirection (direction) {
  if (isNumber(direction)) {
    if (Number(direction) < 0) {
      return 'desc';
    }
    return 'asc';
  }
  if (isString(direction)) {
    if (direction.toLowerCase() === 'desc') {
      return 'desc';
    }
    return 'asc';
  }
  return 'asc';
}

function toColumns (fieldsList) {
  return fieldsList.map(field => {
    const obj = {};
    obj[field] = field;
    return obj;
  });
}

function getFieldByColumnName (columnName, schema) {
  const fields = schema.fields;
  if (fields[columnName]) {
    return fields[columnName];
  }
  for (let field of Object.values(fields)) {
    if (field.columnName === columnName) {
      return field;
    }
  }
  return null;
}

function recordToData (record, schema) {
  return Object.entries(record)
    .reduce((data, [columnName, value]) => {
      const field = getFieldByColumnName(columnName, schema);
      if (!field) {
        return data;
      }
      data[field.fieldName] = value;
      return data;
    }, {});
}

function toModel (record, query) {
  const discriminatorKey = query.Model.discriminatorKey &&
    sanitizeName(query.Model.discriminatorKey);
  const lookups = Object.entries(record)
    .reduce((lookup, [columnName, value]) => {
      setIn(lookup, columnName, value);
      return lookup;
    }, {});

  if (query.Model.children.length) {
    const baseData = lookups[query.Model.tableName];
    const childType = baseData[discriminatorKey];
    if (childType) {
      const childKey = sanitizeName(childType);
      Object.assign(lookups[query.Model.tableName], lookups[childKey]);
      query.Model.children.forEach(Child => delete lookups[Child.tableName]);
    }
  }

  const documents = Object.entries(lookups)
    .reduce((documents, [tableName, record]) => {
      const discriminator = discriminatorKey && record[discriminatorKey];
      const Model = getTableModel(query, tableName, discriminator);
      if (!Model) {
        return documents;
      }
      const data = recordToData(record, Model.schema);

      const document = new Model(data);
      document.isNew = false;

      documents[tableName] = document;

      return documents;
    }, {});
  const baseDoc = documents[query.Model.tableName];
  Object.values(query.joins)
    .forEach((join) => {
      baseDoc[join.fieldName] = documents[join.Model.tableName];
    });

  let Parent = query.Model.Parent;
  while (Parent) {
    Object.assign(baseDoc, documents[Parent.tableName].toObject());
    delete baseDoc.data[Parent.tableName];
    Parent = Parent.Parent;
  }

  if (query.Model.children.length) {
    const TypedModel = query.Model.children.find(ChildModel => {
      return baseDoc[discriminatorKey] === ChildModel.tableName;
    });

    if (TypedModel) {
      const typedBaseDoc = new TypedModel(baseDoc.data);
      typedBaseDoc.isNew = false;
      return typedBaseDoc;
    }
  }

  return baseDoc;
}

module.exports = {
  ensureColumnNamespace,
  getFieldsList,
  getTableModel,
  getWhereBuilder,
  normalizeSortArgs,
  parseSortDirection,
  toColumns,
  toModel
};
