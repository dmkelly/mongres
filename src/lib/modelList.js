const { castArray } = require('../utils');

function ensureDocument(item, Model) {
  if (item instanceof Model) {
    return item;
  }
  return new Model(item);
}

class ModelList extends Array {
  constructor(Model, ...args) {
    super(...args);

    Object.defineProperty(this, 'Model', {
      configurable: false,
      enumerable: false,
      value: Model,
      writable: false
    });
  }

  concat(...lists) {
    const Model = this.Model;
    const modelLists = lists.map(list => {
      if (list instanceof ModelList) {
        return list;
      }
      return castArray(list).map(item => ensureDocument(item, Model));
    });
    return super.concat(...modelLists);
  }
}

function isInteger(value) {
  return parseInt(value, 10) == value;
}

function proxiedModelList(Model, ...list) {
  const modelList = new ModelList(Model, ...list);

  return new Proxy(modelList, {
    get: function(target, property) {
      return target[property];
    },
    set: function(target, property, value) {
      if (!isInteger(property)) {
        target[property] = value;
        return true;
      }

      if (value instanceof Model) {
        target[property] = value;
        return true;
      }
      target[property] = new Model(value);
      return true;
    }
  });
}

ModelList.factory = proxiedModelList;

module.exports = ModelList;
