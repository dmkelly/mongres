class Adaptor {
  constructor(query) {
    this.name = 'AbstractAdaptor';
    this.query = query;
  }

  ensureColumnNamespace(field, Model = this.query.Model) {
    return `${Model.tableName}.${field.columnName}`;
  }

  getFieldsList(Model = this.query.Model) {
    const baseFields = Object.values(Model.subSchema.fields)
      .map(field => {
        if (field.isNested) {
          return null;
        }
        return this.ensureColumnNamespace(field, Model);
      })
      .filter(Boolean);

    return baseFields;
  }

  getModelForTable(/*tableName, discriminator*/) {
    return this.query.Model;
  }

  toModel(lookups, document, Model = this.query.Model) {
    const data = lookups[Model.tableName];
    if (!document) {
      document = new Model();
    }
    if (!data) {
      return document;
    }
    Object.assign(document, data);
    return document;
  }
}

module.exports = Adaptor;
