const Adaptor = require('./adaptor');
const { getBackRefFields } = require('../../model');

class Nested extends Adaptor {
  constructor(query, field) {
    super(query);

    this.name = 'Nested';
    this.field = field;
  }

  async reconcile(results) {
    const [backRefField] = getBackRefFields(
      this.query.Model,
      this.field.type.schema
    );
    const Query = this.query.constructor;

    const idIndexLookup = results.reduce((lookup, document, index) => {
      lookup[document.id] = index;
      return lookup;
    }, {});

    const nestedResults = await new Query(this.field.type).where({
      [backRefField.fieldName]: {
        $in: Object.keys(idIndexLookup)
      }
    });
    nestedResults.forEach(nestedDocument => {
      const parentId = nestedDocument[backRefField.fieldName];
      const resultIndex = idIndexLookup[parentId];
      const parentDocument = results[resultIndex];
      parentDocument[this.field.fieldName].push(nestedDocument);
    });

    return results;
  }
}

module.exports = Nested;
