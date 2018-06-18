const { mapToLookup: toColumns } = require('../../../utils');
const Adaptor = require('./adaptor');

class Populate extends Adaptor {
  static exists(query, Ref, field) {
    return query.adaptors.some(adaptor => {
      return (
        adaptor.name === 'Populate' &&
        adaptor.Ref.tableName === Ref.tableName &&
        adaptor.field.fieldName === field.fieldName
      );
    });
  }

  constructor(query, Ref, field) {
    super(query);

    this.name = 'Populate';
    this.Ref = Ref;
    this.field = field;

    this.isSelfContained =
      !this.field.isNested && !this.Ref.children.length && !this.Ref.Parent;

    if (this.isSelfContained) {
      this.query.query = this.query.query
        .leftJoin(
          this.Ref.tableName,
          `${this.query.Model.tableName}.${field.columnName}`,
          `${this.Ref.tableName}.id`
        )
        .column(toColumns(super.getFieldsList(Ref)));
    }
  }

  toModel(lookups, document) {
    const refRecord = lookups[this.Ref.tableName];
    if (!refRecord) {
      return document;
    }
    const refDocument = new this.Ref(refRecord);
    refDocument.isNew = false;
    document[this.field.fieldName] = refDocument;
    return document;
  }
}

module.exports = Populate;
