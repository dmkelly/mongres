const {
  Integer: IntegerType,
  JsonArray,
  String: StringType
} = require('../../../src/types');

describe('types/JsonArray', () => {
  let field;

  beforeEach(() => {
    field = JsonArray(StringType());
  });

  describe('#cast()', () => {
    it('Casts each value in the array to the type', () => {
      expect(field.cast([0, '', 'test'])).to.deep.equal(['0', '', 'test']);
    });

    it('Ignores non-array values', () => {
      expect(field.cast(1)).not.to.be.ok;
    });
  });

  describe('#isValid()', () => {
    it('Ignores nils', () => {
      expect(field.isValid([0, '', 'test', null])).to.be.ok;
      expect(field.isValid([])).to.be.ok;
      expect(field.isValid(null)).to.be.ok;
      expect(field.isValid()).to.be.ok;
    });

    it('Rejects non-array values', () => {
      expect(field.isValid('test')).not.to.be.ok;
      expect(field.isValid(1)).not.to.be.ok;
      expect(field.isValid(true)).not.to.be.ok;
    });

    it('Rejects arrays that contain an invalid item', () => {
      const intListField = JsonArray(IntegerType());
      expect(intListField.isValid([1, 2, 'test'])).not.to.be.ok;
    });
  });
});
