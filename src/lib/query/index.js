const {
  cloneDeep,
  isNil,
  isNumber,
  isObject,
  isString,
  setIn
} = require('../../utils');
const filterMap = require('../filters');
const adaptors = require('./adaptors');

function ensureColumnNamespace(query, field) {
  if (query.Model.Parent) {
    const adaptor = query.adaptors.find(adaptor => adaptor.name === 'Parent');
    return adaptor.ensureColumnNamespace(field);
  }

  return new adaptors.Default(query).ensureColumnNamespace(field);
}

function getFieldsList(query) {
  return query.adaptors.reduce((fieldsList, adaptor) => {
    const adaptorFields = adaptor.getFieldsList();
    adaptorFields.forEach(adaptorField => {
      const isFieldInList = !!fieldsList.find(field => field === adaptorField);
      if (!isFieldInList) {
        fieldsList.push(adaptorField);
      }
    });
    return fieldsList;
  }, new adaptors.Default(query).getFieldsList());
}

function getTableModel(query, tableName, discriminator) {
  if (tableName === query.Model.tableName) {
    return query.Model;
  }
  if (query.Model.Parent) {
    const adaptor = query.adaptors.find(adaptor => adaptor.name === 'Parent');
    const Model = adaptor.getModelForTable(tableName, discriminator);
    if (Model) {
      return Model;
    }
  }
  const populateAdaptor = query.adaptors.find(
    adaptor =>
      adaptor.name === 'Populate' && adaptor.Ref.tableName === tableName
  );
  if (populateAdaptor) {
    return populateAdaptor.Ref;
  }

  return null; // should never hit this
}

function getWhereBuilder(query, namespacedColumn, filter) {
  if (isNil(filter)) {
    return;
  }

  if (!isObject(filter)) {
    const [tableName, columnName] = namespacedColumn.split('.');
    const Model = getTableModel(query, tableName);
    const field = Model.schema.fields[columnName];
    return builder => builder.where(namespacedColumn, field.cast(filter));
  }

  return builder => {
    Object.entries(filter).forEach(([key, value]) => {
      const filterFn = filterMap[key];
      if (filterFn) {
        // If a query is passed in as a subquery, use the raw knex query
        let valueClause = value;
        if (value && value.query) {
          valueClause = value.query;
        }

        filterFn(builder, namespacedColumn, valueClause);
      }
    });
  };
}

function normalizeSortArgs(...args) {
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

function parseSortDirection(direction) {
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

function toModel(record, query) {
  let TypedModel = null;
  const discriminatorKey = query.Model.discriminatorKey;
  const lookups = Object.entries(record).reduce(
    (lookup, [columnName, value]) => {
      setIn(lookup, columnName, value);
      return lookup;
    },
    {}
  );

  const baseRecord = lookups[query.Model.tableName];

  if (query.Model.children.length) {
    TypedModel = query.Model.children.find(ChildModel => {
      return baseRecord[discriminatorKey] === ChildModel.name;
    });
  }

  const Model = TypedModel || query.Model;
  let document = new adaptors.Default(this).toModel(lookups, null, Model);
  document.isNew = false;

  query.adaptors.forEach(adaptor => {
    document = adaptor.toModel(lookups, document, Model);
  });

  document.originalData = cloneDeep(document.data);

  return document;
}

module.exports = {
  adaptors,
  ensureColumnNamespace,
  getFieldsList,
  getTableModel,
  getWhereBuilder,
  normalizeSortArgs,
  parseSortDirection,
  toModel
};
