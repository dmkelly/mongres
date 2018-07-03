const { isFunction, isString, sanitizeName } = require('./utils');
const { getRef, validateField } = require('./lib/field');
const { ValidationError } = require('./error');

class Field {
  constructor(schema, fieldName, definition) {
    this.schema = schema; // schema.instance is available once the model is created
    this.fieldName = fieldName;
    this.columnName = fieldName;
    this.definition = definition;

    this.ref = definition.ref;
    if (this.ref) {
      this.refTableName = sanitizeName(this.ref);
      this.cascade = !!definition.cascade;
    }

    this.enum = definition.enum
      ? definition.enum.map(entry => definition.type.cast(entry))
      : null;
    this.required = definition.required;
    this.unique = definition.unique;

    this.hasIndex = !!definition.index;
    this.indexType = this.hasIndex
      ? isString(definition.index)
        ? definition.index
        : 'btree'
      : 'btree';

    if (definition.validate) {
      this.validator = definition.validate.validator;
      this.validationTemplate = definition.validate.message;
    }

    this.isMulti = Array.isArray(definition.type);
    this.isNested = this.isMulti && !!definition.attach;

    if (this.isMulti) {
      this.defaultValue = [];
    } else {
      this.defaultValue = isFunction(definition.default)
        ? definition.default
        : this.type.cast(definition.default);
    }
  }

  get type() {
    if (this.isMulti) {
      const type = this.definition.type[0];
      if (typeof type === 'string' && this.schema.instance) {
        return this.schema.instance.model(type);
      }
      return type;
    }
    return this.definition.type;
  }

  cast(value) {
    if (!this.isMulti) {
      if (this.ref) {
        const Ref = getRef(this);
        if (value instanceof Ref) {
          return this.type.cast(value.id);
        }
      }
      return this.type.cast(value);
    }

    if (!Array.isArray(value)) {
      return [];
    }

    const Model = this.type;
    return value.map(item => {
      if (item instanceof Model) {
        return item;
      }
      return new Model(Model.schema.cast(item));
    });
  }

  getConstraints() {
    const constraints = {};
    if (this.required) {
      constraints.required = true;
    }
    if (this.unique) {
      constraints.unique = true;
    }
    if (this.hasIndex) {
      constraints.index = this.indexType;
    }
    if (this.ref) {
      constraints.ref = this.ref;
    }
    return constraints;
  }

  validate(value) {
    if (!this.isMulti) {
      const Ref = getRef(this);
      if (Ref && value instanceof Ref) {
        return value.validate();
      }
      return validateField(this, value);
    }

    if (value && !Array.isArray(value)) {
      throw new ValidationError(
        `Nested field ${this.fieldName} should be a list of ${
          this.type.modelName
        }`,
        {
          field: this.fieldName
        }
      );
    }

    value.forEach(item => item.validate());
  }
}

module.exports = Field;
