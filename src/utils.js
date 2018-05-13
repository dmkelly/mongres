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
  isUndefined,
  pick
};
