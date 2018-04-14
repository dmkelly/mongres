const Model = require('./model');

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

  return Item;
}

module.exports = {
  modelFactory
};
