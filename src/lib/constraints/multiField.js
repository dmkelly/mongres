const Constraint = require('./constraint');

class MultiFieldConstraint extends Constraint {
  constructor (Model, fieldNames) {
    super(Model, null);
    this.fieldNames = fieldNames;
  }
}

module.exports = MultiFieldConstraint;
