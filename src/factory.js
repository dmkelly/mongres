const Model = require('./model');
const Query = require('./query');
const Types = require('./types');
const { castError, isUndefined, isNil } = require('./utils');
const { sanitizeName } = require('./lib/tables');

function extractDefaults (fields) {
  return Object.entries(fields)
    .reduce((defaults, [fieldName, field]) => {
      const value = field.default;
      if (!isNil(value)) {
        defaults[fieldName] = field.type.cast(value);
      }
      return defaults;
    }, {});
}

function attachCore (Model, instance) {
  Model.instance = instance;

  Model.create = async function (data) {
    const client = instance.client;
    const document = new Model(data);
    await document.validate();

    let result;
    try {
      result = await client.table(Model.tableName)
        .insert(document.data, 'id');
    } catch (err) {
      throw castError(err);
    }

    document.id = result[0];
    return document;
  };

  Model.find = function (filters = {}) {
    return new Query(Model, {}).where(filters);
  };

  Model.findOne = function (filters = {}) {
    return new Query(Model, {
      single: true
    })
      .where(filters);
  };

  Model.findById = async function (id) {
    return await Model.findOne({ id });
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

  Model.update = async function (filters, changes) {
    const client = instance.client;
    const result = await client.table(Model.tableName)
      .update(changes);
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
      const defaults = extractDefaults(this.schema.fields);
      this.data = Object.assign({}, defaults, this.schema.cast(data));
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
        const field = schema.fields[fieldName];
        if (field.ref) {
          const Ref = instance.model(field.ref);
          if (value instanceof Ref) {
            this.data[fieldName] = value;
            return;
          }
        }

        const cleaned = field.type.cast(value);
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
