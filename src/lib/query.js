const {
  isNil,
  isNumber,
  isObject,
  isString,
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
  return Object.values(Model.schema.fields)
    .map((field) => {
      if (field.isNested) {
        return null;
      }
      return ensureColumnNamespace(field, Model);
    })
    .filter(Boolean);
}

function getTableModel (query, fieldName) {
  const [tableName] = fieldName.split('.');
  const Model = tableName === query.Model.tableName
    ? query.Model
    : query.joins[tableName].Model;
  return Model;
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
  const lookups = Object.entries(record)
    .reduce((lookup, [columnName, value]) => {
      setIn(lookup, columnName, value);
      return lookup;
    }, {});
  const documents = Object.entries(lookups)
    .reduce((documents, [tableName, record]) => {
      const Model = getTableModel(query, tableName);
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
