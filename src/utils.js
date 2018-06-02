const _ = require('lodash');
const error = require('./error');

function castError (err) {
  if (err.code === '23505') {
    return new error.ConflictError(err);
  }
  return err;
}

function escapeRegExp (text) {
  return text.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}

function invoke (fns) {
  for (let fn of fns) {
    fn();
  }
}

async function invokeSeries (fns) {
  for (let fn of fns) {
    await fn();
  }
}

function sanitizeName (name) {
  return name.trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_');
}

function template (text, substitutions) {
  return Object.entries(substitutions)
    .reduce((message, [key, value]) => {
      const matcher = new RegExp(`\\{${escapeRegExp(key)}\\}`, 'g');
      return message.replace(matcher, `${value}`);
    }, text);
}

module.exports = {
  castError,
  cloneDeep: _.cloneDeep,
  escapeRegExp,
  invoke,
  invokeSeries,
  isFunction: _.isFunction,
  isNil: _.isNil,
  isNumber: _.isNumber,
  isObject: _.isObject,
  isString: _.isString,
  isUndefined: _.isUndefined,
  pick: _.pick,
  sanitizeName,
  setIn: _.set,
  template
};
