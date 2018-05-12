const Id = require('./id');
const Integer = require('./integer');

module.exports = {
  Type: require('./type'),
  Id: () => new Id(),
  Integer: () => new Integer()
};
