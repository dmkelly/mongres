const error = require('./error');

function castError (err) {
  if (err.code === '23505') {
    return new error.ConflictError(err);
  }
  return err;
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

module.exports = {
  castError,
  invoke,
  invokeSeries,
  isUndefined,
  pick
};
