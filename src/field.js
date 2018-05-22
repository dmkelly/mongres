const {
  isFunction,
  isString,
  isUndefined,
  sanitizeName,
  template
} = require('./utils');
const { ValidationError } = require('./error');

class Field {
  constructor (schema, fieldName, definition) {
    this.schema = schema; // schema.instance is available once the model is created
    this.name = fieldName;
    this.columnName = sanitizeName(fieldName);
    this.type = definition.type;
    this.ref = definition.ref;
    if (this.ref) {
      this.refTableName = sanitizeName(this.ref);
    }
    this.required = definition.required;
    this.unique = definition.unique;
    this.hasIndex = !!definition.index;
    this.indexType = this.hasIndex
      ? (isString(definition.index) ? definition.index : 'btree')
      : 'btree';
    this.defaultValue = this.type.cast(definition.default);
    if (definition.validate) {
      this.validator = definition.validate.validator;
      this.validationTemplate = definition.validate.message;
    }
  }

  getConstraints () {
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

  validate (value) {
    if (isUndefined(value)) {
      if (this.required) {
        throw new ValidationError(`Field ${this.name} is required`, {
          field: this.name
        });
      }
      return;
    }
    if (!this.type.isValid(value)) {
      throw new ValidationError(`Invalid value of field ${this.name}: ${value}`, {
        field: this.name,
        value
      });
    }
    if (this.validator && isFunction(this.validator)) {
      if (!this.validator(value)) {
        const defaultMessage = `Validation failed on ${this.name}: ${value}`;
        const messageText = this.validationTemplate && template(this.validationTemplate, {
          VALUE: value
        });
        throw new ValidationError(messageText || defaultMessage, {
          field: this.name,
          value
        });
      }
    }
  }
}

module.exports = Field;
