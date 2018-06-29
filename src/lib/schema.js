function hasNestedFields(schema) {
  return Object.values(schema.fields).some(field => field.isNested);
}

module.exports = {
  hasNestedFields
};
