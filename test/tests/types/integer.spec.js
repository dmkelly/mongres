const Integer = require('../../../src/types/integer');

describe('types/Integer', () => {
  describe('#cast()', () => {
    let integer;

    beforeEach(() => {
      integer = new Integer();
    });

    it('Handles integers', () => {
      expect(integer.cast(5)).to.equal(5);
      expect(integer.cast(0)).to.equal(0);
      expect(integer.cast(-5)).to.equal(-5);
    });

    it('Handles floats', () => {
      expect(integer.cast(7.2)).to.equal(7);
      expect(integer.cast(7.8)).to.equal(7);
    });

    it('Handles numeric strings', () => {
      expect(integer.cast('5')).to.equal(5);
      expect(integer.cast('5.3')).to.equal(5);
      expect(integer.cast('-5')).to.equal(-5);
    });

    it('Prunes things that are not integers', () => {
      expect(integer.cast({})).to.be.undefined;
      expect(integer.cast(null)).to.be.undefined;
      expect(integer.cast()).to.be.undefined;
      expect(integer.cast('')).to.be.undefined;
      expect(integer.cast(NaN)).to.be.undefined;
      expect(integer.cast([])).to.be.undefined;
    });
  });
});
