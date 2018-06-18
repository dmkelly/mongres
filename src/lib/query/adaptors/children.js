const Adaptor = require('./adaptor');
const Parent = require('./parent');

class Children extends Adaptor {
  constructor(query) {
    super(query);

    this.name = 'Children';

    for (let Child of this.query.Model.children) {
      this.query.query = this.query.query.leftJoin(
        Child.tableName,
        `${this.query.Model.tableName}.id`,
        `${Child.tableName}.id`
      );
    }
  }

  getModelForTable(tableName, discriminator) {
    for (let Child of this.query.Model.children) {
      if (Child.tableName === tableName) {
        return Child;
      }
      if (discriminator && Child.modelName === discriminator) {
        return Child;
      }
    }
  }

  getFieldsList(Model = this.query.Model) {
    const baseFields = super.getFieldsList(Model);

    const allFields = Model.children.reduce((fieldsList, Child) => {
      const childFields = super.getFieldsList(Child);
      return fieldsList.concat(childFields);
    }, baseFields);

    return allFields;
  }

  toModel(lookups, document, Model = this.query.Model) {
    // Model is already cast as the child instance
    return Parent.prototype.toModel.call(this, lookups, document, Model);
  }
}

module.exports = Children;
