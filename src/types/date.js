const { isDate, isNil, isNumber, isString } = require('../utils');
const Type = require('./type');

class DateType extends Type {
  constructor() {
    super();
    this.dataType = 'date';
  }

  cast(value) {
    if (isNil(value)) {
      return;
    }

    if (!isString(value) && !isNumber(value) && !isDate(value)) {
      return;
    }

    if (isString(value)) {
      const asDate = new Date(value);

      if (isNaN(asDate.getTime())) {
        value = new Date(parseInt(value));
      } else {
        value = asDate;
      }
    } else {
      value = new Date(value);
    }

    if (isNaN(value.getTime())) {
      return;
    }

    return value;
  }

  defineColumn(table, columnName) {
    return table.timestamp(columnName);
  }

  isEqual(value1, value2) {
    if (value1 == null) {
      return value2 == null;
    }
    if (value2 == null) {
      return value1 == null;
    }
    return value1.getTime() === value2.getTime();
  }

  isValid(value) {
    if (isNil(value)) {
      return true;
    }
    value = this.cast(value);
    return !!value;
  }
}

module.exports = DateType;
