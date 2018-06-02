const Float = require('../../../src/types/float');

describe('types/Float', () => {
  describe('#cast()', () => {
    let field;

    beforeEach(() => {
      field = new Float();
    });

    it('Handles numbers', () => {
      expect(field.cast(5)).to.equal(5);
      expect(field.cast(5.5)).to.equal(5.5);
    });

    it('Handles strings', () => {
      expect(field.cast('5')).to.equal(5);
      expect(field.cast('5.5')).to.equal(5.5);
      expect(field.cast('bad')).to.be.undefined;
    });

    it('Handles objects', () => {
      expect(field.cast({
        test: 5
      })).to.be.undefined;
    });

    it('Correctly handles falsy values', () => {
      expect(field.cast(null)).to.be.undefined;
      expect(field.cast()).to.be.undefined;
      expect(field.cast(0)).to.equal(0);
      expect(field.cast('')).to.be.undefined;
      expect(field.cast(false)).to.be.undefined;
    });
  });

  describe('#isValid()', () => {
    let field;

    beforeEach(() => {
      field = new Float();
    });

    it('Ignores nils', () => {
      expect(field.isValid()).to.be.ok;
      expect(field.isValid(null)).to.be.ok;
    });

    it('Handles things that can be a number', () => {
      expect(field.isValid(5)).to.be.ok;
      expect(field.isValid('5')).to.be.ok;
      expect(field.isValid('5.5')).to.be.ok;
    });

    it('Rejects values that are not numeric', () => {
      expect(field.isValid('bad')).not.to.be.ok;
      expect(field.isValid({})).not.to.be.ok;
      expect(field.isValid(false)).not.to.be.ok;
    });
  });
});
