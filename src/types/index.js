const Integer = require('./integer');

module.exports = {
  Type: require('./type'),
  Integer: () => new Integer()
};
