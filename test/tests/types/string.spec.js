const String = require('../../../src/types/string');

describe('types/String', () => {
  let field;

  beforeEach(() => {
    field = new String(10);
  });

  describe('#cast()', () => {
    it('Handles strings', () => {
      expect(field.cast('5')).to.equal('5');
      expect(field.cast('string')).to.equal('string');
    });

    it('Handles objects', () => {
      expect(field.cast({
        test: 5
      })).to.equal(JSON.stringify({
        test: 5
      }));
    });

    it('Correctly handles falsy values', () => {
      expect(field.cast(null)).to.be.undefined;
      expect(field.cast()).to.be.undefined;
      expect(field.cast(0)).to.equal('0');
      expect(field.cast('')).to.equal('');
      expect(field.cast(false)).to.equal('false');
    });
  });

  describe('#isValid()', () => {
    it('Ignores nils', () => {
      expect(field.isValid()).to.be.ok;
      expect(field.isValid(null)).to.be.ok;
    });

    it('Handles things that can be a string', () => {
      expect(field.isValid(false)).to.be.ok;
      expect(field.isValid(true)).to.be.ok;
      expect(field.isValid(5)).to.be.ok;
      expect(field.isValid('test')).to.be.ok;
      expect(field.isValid({
        test: 5
      })).to.be.ok;
    });

    it('Rejects values that are too long', () => {
      expect(field.isValid('a'.repeat(11))).not.to.be.ok;
    });
  });
});
