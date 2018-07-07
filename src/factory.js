const Field = require('./field');
const Model = require('./model');
const statics = require('./statics');
const Types = require('./types');
const { isUndefined, isFunction, isNil, sanitizeName } = require('./utils');

function extractDefaults(fields) {
  return Object.entries(fields).reduce((defaults, [fieldName, field]) => {
    let value = field.defaultValue;
    if (isFunction(value)) {
      value = value();
    }
    if (!isNil(value)) {
      defaults[fieldName] = field.cast(value);
    }
    return defaults;
  }, {});
}

function attachCore(Model, instance) {
  Model.instance = instance;

  Object.keys(statics).forEach(key => {
    Model[key] = statics[key](Model, instance);
  });

  Model.discriminator = function(modelName, schema) {
    const { discriminatorKey = 'type' } = schema.options;

    if (!schema.fields[Model.tableName]) {
      schema.fields[Model.tableName] = new Field(schema, Model.tableName, {
        type: Types.Integer()
      });
    }
    if (!schema.fields[discriminatorKey]) {
      schema.fields[discriminatorKey] = new Field(
        Model.subSchema,
        discriminatorKey,
        {
          default: modelName,
          type: Types.String(63)
        }
      );
    }
    if (!Model.subSchema.fields[discriminatorKey]) {
      Model.subSchema.fields[discriminatorKey] = new Field(
        Model.subSchema,
        discriminatorKey,
        {
          type: Types.String(63)
        }
      );
    }
    if (!Model.schema.fields[discriminatorKey]) {
      Model.schema.fields[discriminatorKey] = new Field(
        Model.schema,
        discriminatorKey,
        {
          type: Types.String(63)
        }
      );
    }

    const Item = modelFactory(instance, modelName, schema, Model);

    Item.prototype.Parent = Model;

    Item.Parent = Model;
    Item.discriminatorKey = discriminatorKey;

    Model.children.push(Item);
    Model.discriminatorKey = discriminatorKey;

    attachProperties(Model, instance, schema);

    return Item;
  };
}

function attachMethods(Model, schema) {
  Object.entries(schema.methods).forEach(([name, fn]) => {
    Model.prototype[name] = fn;
  });
}

function attachProperties(Model, instance, schema) {
  const properties = Object.keys(schema.fields);
  properties.forEach(fieldName => {
    if (!Model.prototype.hasOwnProperty(fieldName)) {
      const modifier = schema.modifiers.get(fieldName);

      Object.defineProperty(Model.prototype, fieldName, {
        enumerable: true,
        get: function() {
          const value = this.data[fieldName];
          if (modifier && modifier.getter) {
            return modifier.getter.call(this, value);
          }
          return value;
        },
        set: function(value) {
          const field = schema.fields[fieldName];
          if (field.ref) {
            const Ref = instance.model(field.ref);
            if (value instanceof Ref) {
              this.data[fieldName] = value;
              return;
            }
          }

          const cleaned = field.cast(value);
          const newValue = isNil(cleaned) ? null : cleaned;

          if (modifier && modifier.setter) {
            this.data[fieldName] = modifier.setter.call(this, newValue);
            return;
          }
          this.data[fieldName] = newValue;
        }
      });
    }
  });
}

function attachStatics(Model, schema) {
  Object.entries(schema.statics).forEach(([name, fn]) => {
    Model[name] = fn;
  });
}

function attachVirtuals(Model, schema) {
  for (let virtual of schema.virtuals.values()) {
    Object.defineProperty(Model.prototype, virtual.name, {
      enumerable: true,
      get: function() {
        if (virtual.getter) {
          return virtual.getter.call(this);
        }
      },
      set: function(value) {
        if (virtual.setter) {
          return virtual.setter.call(this, value);
        }
      }
    });
  }
}

function modelFactory(instance, name, schema, BaseModel = Model) {
  const parentSchema = BaseModel.schema;
  const subSchema = schema;
  const fullSchema = parentSchema.extend(schema);
  subSchema.instance = instance;
  schema.instance = instance;
  fullSchema.instance = instance;

  class Item extends BaseModel {
    constructor(...args) {
      super(...args);

      const [data] = args;

      this.instance = instance;
      this.parentSchema = parentSchema;
      this.subSchema = subSchema;
      this.schema = fullSchema;
      const defaults = extractDefaults(this.schema.fields);

      // set the data directly on document through getters/setters
      this.data = {};
      Object.assign(this, defaults, this.schema.cast(data));
    }
  }

  Object.defineProperty(Item, 'name', {
    value: name
  });

  Item.modelName = name;
  Item.tableName = sanitizeName(name);
  Item.schema = fullSchema;
  Item.subSchema = subSchema;
  Item.parentSchema = parentSchema;
  Item.children = [];
  Item.prototype.Model = Item;
  Item.prototype.Model.tableName = Item.tableName;

  attachProperties(Item, instance, schema);
  attachCore(Item, instance);
  attachMethods(Item, schema);
  attachStatics(Item, schema);
  attachVirtuals(Item, schema);

  instance.models.set(name, Item);

  return Item;
}

module.exports = {
  modelFactory
};
