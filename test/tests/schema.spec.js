const Schema = require('../../src/schema');

describe('Schema', () => {
  describe('#cast()', () => {
    let schema;

    beforeEach(() => {
      schema = new Schema({
        testField: {
          type: Schema.Types.Integer()
        }
      });
    });

    it('Accepts valid data', () => {
      const cleaned = schema.cast({
        testField: 5
      });
      expect(cleaned).to.deep.equal({
        testField: 5
      });
    });

    it('Prunes extraneous fields', () => {
      const cleaned = schema.cast({
        testField: 5,
        badField: 5
      });
      expect(cleaned).to.deep.equal({
        testField: 5
      });
    });

    it('Skips missing fields', () => {
      const cleaned = schema.cast({});
      expect(cleaned).to.deep.equal({});
    });

    it('Gracefully handles no data', () => {
      const cleaned = schema.cast();
      expect(cleaned).to.deep.equal({});
    });
  });
});
