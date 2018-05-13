const isNumber = require('is-number');
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

function isFunction (value) {
  return typeof value === 'function';
}

function isString (value) {
  return typeof value === 'string';
}

function isUndefined (value) {
  return typeof value === 'undefined';
}

function pick (object, keys) {
  return keys.reduce((cleaned, key) => {
    if (object.hasOwnProperty(key)) {
      cleaned[key] = object[key];
    }
    return cleaned;
  }, {});
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
  escapeRegExp,
  invoke,
  invokeSeries,
  isFunction,
  isNumber,
  isString,
  isUndefined,
  pick,
  template
};
