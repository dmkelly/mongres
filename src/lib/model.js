function serialize (document) {
  const { instance, schema } = document;
  const data = Object.keys(schema.fields)
    .reduce((data, fieldName) => {
      const field = schema.fields[fieldName];
      const value = document[fieldName];

      if (field.ref) {
        const Ref = instance.model(field.ref);
        if (Ref && value instanceof Ref) {
          data[fieldName] = value.id;
          return data;
        }
      }

      if (field.isNested) {
        return data;
      }

      data[fieldName] = value;
      return data;
    }, {});
  return data;
}

module.exports = {
  serialize
};
