module.exports = {
  ref: require('./ref'),
  index: require('./indexConstraint'),
  unique: require('./unique'),
  multi: {
    Index: require('./multiIndex'),
    Unique: require('./multiUnique')
  }
};
