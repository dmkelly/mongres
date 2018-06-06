class Virtual {
  constructor(name) {
    this.name = name;
    this.getter = null;
    this.setter = null;
  }

  get(getter) {
    this.getter = getter;
    return this;
  }

  set(setter) {
    this.setter = setter;
    return this;
  }
}

module.exports = Virtual;
