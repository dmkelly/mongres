const Model = require('./model');
const { isUndefined } = require('./utils');

function modelFactory (instance, name, schema) {
  class Item extends Model {
    constructor (...args) {
      super(...args);

      const [data] = args;

      this.instance = instance;
      this.name = name;
      this.schema = schema;
      this.data = this.schema.cast(data);
    }
  }

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

  return Item;
}

module.exports = {
  modelFactory
};
