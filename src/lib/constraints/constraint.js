class Constraint {
  constructor (Model, field) {
    this.Model = Model;
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
