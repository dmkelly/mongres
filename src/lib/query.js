const { isNumber, isString } = require('../utils');

function normalizeSortArgs (...args) {
  if (args.length === 1) {
    const param = args[0];
    if (param.startsWith('-')) {
      return [param.substr(1), 'desc'];
    }
    return [param, 'asc'];
  }
  if (args.length === 2) {
    return [args[0], parseSortDirection(args[1])];
  }
  return [];
}

function parseSortDirection (direction) {
  if (isNumber(direction)) {
    if (Number(direction) < 0) {
      return 'desc';
    }
    return 'asc';
  }
  if (isString(direction)) {
    if (direction.toLowerCase() === 'desc') {
      return 'desc';
    }
    return 'asc';
  }
  return 'asc';
}

module.exports = {
  normalizeSortArgs,
  parseSortDirection
};
