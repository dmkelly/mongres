const Model = require('./model');
const Types = require('./types');
const { isUndefined, pick } = require('./utils');
const { sanitizeName } = require('./lib/tables');

function attachCore (Model, instance) {
  Model.instance = instance;

  Model.update = async function (filters, changes) {
    const client = instance.client;
    const result = await client.table(Model.tableName)
      .update(changes);
    return {
      nModified: result
    };
  };

  Model.find = async function (filters = {}) {
    const client = instance.client;
    const results = await client.table(Model.tableName)
      .select()
      .where(pick(filters, Object.keys(Model.schema.fields)));
    return results.map((record) => new Model(record));
  };

  Model.findOne = async function (filters = {}) {
    const client = instance.client;
    const results = await client.table(Model.tableName)
      .select()
      .where(pick(filters, Object.keys(Model.schema.fields)))
      .limit(1);
    if (!results.length) {
      return null;
    }
    return new Model(results[0]);
  };

  Model.findById = function (id) {
    return Model.findOne({ id });
  };

  Model.remove = async function (filters) {
    if (!filters) {
      throw await new Error('Model.remove() requires conditions');
    }
    const client = instance.client;
    const result = await client.table(Model.tableName)
      .where(filters)
      .del();
    return {
      nModified: result
    };
  };
}

function attachMethods (Model, schema) {
  Object.entries(schema.methods)
    .forEach(([name, fn]) => {
      Model.prototype[name] = fn;
    });
}

function attachStatics (Model, schema) {
  Object.entries(schema.statics)
    .forEach(([name, fn]) => {
      Model[name] = fn;
    });
}

function attachVirtuals (Model, schema) {
  for (let virtual of schema.virtuals.values()) {
    Object.defineProperty(Model.prototype, virtual.name, {
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
}

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

  if (!schema.fields.id) {
    schema.fields.id = {
      type: Types.Id()
    };
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

  attachCore(Item, instance);
  attachMethods(Item, schema);
  attachStatics(Item, schema);
  attachVirtuals(Item, schema);

  return Item;
}

module.exports = {
  modelFactory
};
