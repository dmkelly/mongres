const { isNil, isNumber, isObject, isString } = require('../utils');
const filterMap = require('./filters');

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

function getWhereBuilder (schema, fieldName, filter) {
  const field = schema.fields[fieldName];

  if (isNil(filter)) {
    return;
  }

  if (!isObject(filter)) {
    return (builder) => builder.where(fieldName, field.type.cast(filter));
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
  normalizeSortArgs,
  parseSortDirection,
  getWhereBuilder
};
