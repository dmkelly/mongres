class Constraint {
  constructor (Model, columnName, field) {
    this.Model = Model;
    this.columnName = columnName;
    this.field = field;
  }

  async exists () {
    return await false;
  }

  create (table) {
    return table;
  }
}

module.exports = Constraint;
