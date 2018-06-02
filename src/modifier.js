class Modifier {
  constructor (fieldName) {
    this.fieldName = fieldName;
  }

  get (callback) {
    this.getter = callback;
  }

  set (callback) {
    this.setter = callback;
  }
}

module.exports = Modifier;
