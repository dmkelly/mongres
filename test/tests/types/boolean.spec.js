const Boolean = require('../../../src/types/boolean');

describe('types/Boolean', () => {
  let field;

  beforeEach(() => {
    field = new Boolean();
  });

  describe('#cast()', () => {
    it('Handles booleans', () => {
      expect(field.cast(true)).to.equal(true);
      expect(field.cast(false)).to.equal(false);
    });

    it('Handles numbers', () => {
      expect(field.cast(5)).to.equal(true);
      expect(field.cast(0)).to.equal(false);
    });

    it('Handles strings', () => {
      expect(field.cast('a')).to.equal(true);
      expect(field.cast('')).to.equal(false);
    });

    it('Handles objects', () => {
      expect(
        field.cast({
          test: 5
        })
      ).to.equal(true);
    });

    it('Correctly handles falsy values', () => {
      expect(field.cast(null)).to.be.undefined;
      expect(field.cast()).to.be.undefined;
      expect(field.cast(0)).to.equal(false);
      expect(field.cast('')).to.equal(false);
      expect(field.cast(false)).to.equal(false);
    });
  });

  describe('#isValid()', () => {
    it('Ignores nils', () => {
      expect(field.isValid()).to.be.ok;
      expect(field.isValid(null)).to.be.ok;
    });

    it('Handles things that can be a boolean', () => {
      expect(field.isValid(5)).to.be.ok;
      expect(field.isValid('a')).to.be.ok;
      expect(field.isValid({})).to.be.ok;
      expect(field.isValid(true)).to.be.ok;
    });
  });
});
