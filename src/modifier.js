class Modifier {
  constructor(fieldName) {
    this.fieldName = fieldName;
  }

  get(callback) {
    if (this.getter) {
      throw new Error(`A getter already exists on ${this.fieldName}`);
    }
    this.getter = callback;
    return this;
  }

  set(callback) {
    if (this.setter) {
      throw new Error(`A setter already exists on ${this.fieldName}`);
    }
    this.setter = callback;
    return this;
  }
}

module.exports = Modifier;
