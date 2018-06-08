const { ValidationError } = require('../error');
const { isFunction, isNil, template } = require('../utils');

function getRef(field) {
  if (!field.ref) {
    return null;
  }
  return field.schema.instance.model(field.ref);
}

function validateField(field, value) {
  if (isNil(value)) {
    if (field.required) {
      throw new ValidationError(`Field ${field.fieldName} is required`, {
        field: field.fieldName
      });
    }
    return;
  }
  if (!field.type.isValid(value)) {
    throw new ValidationError(
      `Invalid value of field ${field.fieldName}: ${value}`,
      {
        field: field.fieldName,
        value
      }
    );
  }
  if (field.enum && !field.enum.includes(value)) {
    throw new ValidationError(
      `Field ${field.fieldName} must be one of ${JSON.stringify(
        field.enum
      )}: ${value}`
    );
  }
  if (field.validator && isFunction(field.validator)) {
    if (!field.validator(value)) {
      const defaultMessage = `Validation failed on ${
        field.fieldName
      }: ${value}`;
      const messageText =
        field.validationTemplate &&
        template(field.validationTemplate, {
          VALUE: value
        });
      throw new ValidationError(messageText || defaultMessage, {
        field: field.fieldName,
        value
      });
    }
  }
}

module.exports = {
  getRef,
  validateField
};
