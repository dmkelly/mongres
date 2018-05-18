const { sanitizeName } = require('../utils');

module.exports = {
  ref: (table, columnName, field) => {
    return table.foreign(columnName)
      .references(`${sanitizeName(field.ref)}.id`);
  }
};
