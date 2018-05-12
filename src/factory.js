const Model = require('./model');
const { isUndefined } = require('./utils');
const { sanitizeName } = require('./lib/tables');

function modelFactory (instance, name, schema) {
  class Item extends Model {
    constructor (...args) {
      super(...args);

      const [data] = args;

      this.instance = instance;
      this.schema = schema;
      this.data = this.schema.cast(data);
    }
  }

  Item.tableName = sanitizeName(name);
  Item.schema = schema;
  Item.prototype.Model = Item;

  const properties = Object.keys(schema.fields);
  properties.forEach((fieldName) => {
    Object.defineProperty(Item.prototype, fieldName, {
      get: function () {
        return this.data[fieldName];
      },
      set: function (value) {
        const cleaned = schema.fields[fieldName].type.cast(value);
        if (!isUndefined(cleaned)) {
          this.data[fieldName] = cleaned;
        }
      }
    });
  });

  for (let virtual of schema.virtuals.values()) {
    Object.defineProperty(Item.prototype, virtual.name, {
      get: function () {
        if (virtual.getter) {
          return virtual.getter.call(this);
        }
      },
      set: function (value) {
        if (virtual.setter) {
          return virtual.setter.call(this, value);
        }
      }
    });
  }

  return Item;
}

module.exports = {
  modelFactory
};
