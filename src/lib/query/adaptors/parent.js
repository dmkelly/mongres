const Adaptor = require('./adaptor');

class Parent extends Adaptor {
  constructor(query, Model) {
    super(query);

    this.name = 'Parent';

    this.Model = Model || this.query.Model;

    this.query.query = this.query.query.join(
      this.Model.Parent.tableName,
      `${this.Model.tableName}.id`,
      `${this.Model.Parent.tableName}.id`
    );
  }

  ensureColumnNamespace(field, Model = this.Model) {
    if (Model.subSchema.fields[field.fieldName]) {
      return super.ensureColumnNamespace(field, Model);
    }

    let Parent = Model.Parent;
    while (Parent) {
      if (Parent.subSchema.fields[field.fieldName]) {
        return `${Parent.tableName}.${field.columnName}`;
      }
      Parent = Parent.Parent;
    }
    return null;
  }

  getFieldsList(Model = this.Model) {
    let fields = super.getFieldsList(Model);

    let Parent = Model.Parent;
    while (Parent) {
      fields = fields.concat(super.getFieldsList(Parent));
      Parent = Parent.Parent;
    }

    return fields;
  }

  getModelForTable(tableName) {
    let Parent = this.Model.Parent;
    while (Parent) {
      if (Parent.tableName === tableName) {
        return Parent;
      }
      Parent = Parent.Parent;
    }
    return null;
  }

  toModel(lookups, document, Model = this.Model) {
    let Parent = Model.Parent;
    while (Parent) {
      document = super.toModel(lookups, document, Parent);
      Parent = Parent.Parent;
    }
    return document;
  }
}

module.exports = Parent;
