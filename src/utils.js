const _ = require('lodash');
const error = require('./error');

function castError(err) {
  if (error.isConflictError(err)) {
    return new error.ConflictError(err);
  }
  return err;
}

function escapeRegExp(text) {
  return text.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}

function getRelationTableName(relation) {
  const [ModelA, ModelB] = relation;
  const tableNames = [ModelA.tableName, ModelB.tableName];
  tableNames.sort();
  return tableNames.join('_');
}

function invoke(fns) {
  for (let fn of fns) {
    fn();
  }
}

async function invokeSeries(fns) {
  for (let fn of fns) {
    await fn();
  }
}

function mapToLookup(array) {
  return array.map(field => {
    const obj = {};
    obj[field] = field;
    return obj;
  });
}

function sanitizeName(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_');
}

function template(text, substitutions) {
  return Object.entries(substitutions).reduce((message, [key, value]) => {
    const matcher = new RegExp(`\\{${escapeRegExp(key)}\\}`, 'g');
    return message.replace(matcher, `${value}`);
  }, text);
}

module.exports = {
  castArray: _.castArray,
  castError,
  cloneDeep: _.cloneDeep,
  deepEquals: _.isEqual,
  escapeRegExp,
  get: _.get,
  getRelationTableName,
  groupBy: _.groupBy,
  invoke,
  invokeSeries,
  isDate: _.isDate,
  isEmpty: _.isEmpty,
  isFunction: _.isFunction,
  isNil: _.isNil,
  isNumber: _.isNumber,
  isObject: _.isObject,
  isString: _.isString,
  isUndefined: _.isUndefined,
  keyBy: _.keyBy,
  mapToLookup,
  pick: _.pick,
  sanitizeName,
  setIn: _.set,
  template
};
