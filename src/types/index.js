const Boolean = require('./boolean');
const Date = require('./date');
const Float = require('./float');
const Id = require('./id');
const Integer = require('./integer');
const String = require('./string');

module.exports = {
  Boolean: (...args) => new Boolean(...args),
  Date: (...args) => new Date(...args),
  Type: require('./type'),
  Float: (...args) => new Float(...args),
  Id: (...args) => new Id(...args),
  Integer: (...args) => new Integer(...args),
  String: (...args) => new String(...args)
};
