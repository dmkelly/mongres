const { isNil, isNumber, isObject, isString } = require('../utils');
const filterMap = require('./filters');

function getTableModel (query, fieldName) {
  const [tableName] = fieldName.split('.');
  const Model = tableName === query.Model.tableName
    ? query.Model
    : query.joins[tableName].Model;
  return Model;
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

module.exports = {
  getTableModel,
  normalizeSortArgs,
  parseSortDirection,
  getWhereBuilder
};
