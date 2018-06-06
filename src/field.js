const { isString, sanitizeName } = require('./utils');
const { getRef, validateField } = require('./lib/field');
const { ValidationError } = require('./error');

class Field {
  constructor(schema, fieldName, definition) {
    this.schema = schema; // schema.instance is available once the model is created
    this.fieldName = fieldName;
    this.columnName = sanitizeName(fieldName);
    this.definition = definition;

    this.ref = definition.ref;
    if (this.ref) {
      this.refTableName = sanitizeName(this.ref);
    }

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

    if (Array.isArray(definition.type)) {
      this.type = definition.type[0];

      this.defaultValue = [];
      this.isNested = true;
    } else {
      this.type = definition.type;
      this.defaultValue = this.type.cast(definition.default);
      this.isNested = false;
    }
  }

  cast(value) {
    if (!this.isNested) {
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
    if (!this.isNested) {
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
