const { isUndefined } = require('../utils');

function getRecord(document) {
  const data = Object.keys(document.subSchema.fields).reduce((data, key) => {
    const value = document[key];
    if (!isUndefined(value)) {
      data[key] = document[key];
    }
    return data;
  }, {});
  return data;
}

module.exports = {
  getRecord
};
