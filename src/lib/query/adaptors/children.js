const Adaptor = require('./adaptor');
const Parent = require('./parent');

class Children extends Adaptor {
  constructor(query, Model) {
    super(query);

    this.name = 'Children';
    this.Model = Model || this.query.Model;

    for (let Child of this.Model.children) {
      this.query.query = this.query.query.leftJoin(
        Child.tableName,
        `${this.Model.tableName}.id`,
        `${Child.tableName}.id`
      );
    }
  }

  getFieldsList(Model = this.Model) {
    const baseFields = super.getFieldsList(Model);

    const allFields = Model.children.reduce((fieldsList, Child) => {
      const childFields = super.getFieldsList(Child);
      return fieldsList.concat(childFields);
    }, baseFields);

    return allFields;
  }

  toModel(lookups, document, Model = this.Model) {
    // Model is already cast as the child instance
    return Parent.prototype.toModel.call(this, lookups, document, Model);
  }
}

module.exports = Children;
