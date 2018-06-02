const Integer = require('../../../src/types/integer');

describe('types/Integer', () => {
  let field;

  beforeEach(() => {
    field = new Integer();
  });

  describe('#cast()', () => {
    it('Handles integers', () => {
      expect(field.cast(5)).to.equal(5);
      expect(field.cast(0)).to.equal(0);
      expect(field.cast(-5)).to.equal(-5);
    });

    it('Handles floats', () => {
      expect(field.cast(7.2)).to.equal(7);
      expect(field.cast(7.8)).to.equal(7);
    });

    it('Handles numeric strings', () => {
      expect(field.cast('5')).to.equal(5);
      expect(field.cast('5.3')).to.equal(5);
      expect(field.cast('-5')).to.equal(-5);
    });

    it('Prunes things that are not integers', () => {
      expect(field.cast({})).to.be.undefined;
      expect(field.cast(null)).to.be.undefined;
      expect(field.cast()).to.be.undefined;
      expect(field.cast('')).to.be.undefined;
      expect(field.cast(NaN)).to.be.undefined;
      expect(field.cast([])).to.be.undefined;
    });
  });
});
