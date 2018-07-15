const StringType = require('./string');

class Text extends StringType {
  constructor() {
    super(Number.MAX_SAFE_INTEGER);
    this.dataType = 'text';
  }

  defineColumn(table, columnName) {
    return table.text(columnName);
  }
}

module.exports = Text;
