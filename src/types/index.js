const Float = require('./float');
const Id = require('./id');
const Integer = require('./integer');
const String = require('./string');

module.exports = {
  Type: require('./type'),
  Float: (...args) => new Float(...args),
  Id: (...args) => new Id(...args),
  Integer: (...args) => new Integer(...args),
  String: (...args) => new String(...args)
};
