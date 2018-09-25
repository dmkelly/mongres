function getBackRefFields(Model, schema) {
  const fields = Object.values(schema.fields);
  const backRefFields = fields.reduce((backRefFields, field) => {
    if (field.refTableName === Model.tableName) {
      backRefFields.push(field);
    }
    return backRefFields;
  }, []);
  return backRefFields;
}

function serialize(document, schema) {
  const { instance } = document;
  const data = Object.keys(schema.fields).reduce((data, fieldName) => {
    const field = schema.fields[fieldName];
    const value = document.data[fieldName];

    if (field.ref) {
      const Ref = instance.model(field.ref);
      if (Ref && value instanceof Ref) {
        data[field.columnName] = field.type.serialize(value.id);
        return data;
      }
    }

    if (field.isMulti) {
      return data;
    }

    data[field.columnName] = field.type.serialize(value);
    return data;
  }, {});
  return data;
}

module.exports = {
  getBackRefFields,
  serialize
};
