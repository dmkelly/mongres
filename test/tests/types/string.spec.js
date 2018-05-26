const String = require('../../../src/types/string');

describe('types/String', () => {
  describe('#cast()', () => {
    let string;

    beforeEach(() => {
      string = new String(10);
    });

    it('Handles strings', () => {
      expect(string.cast('5')).to.equal('5');
      expect(string.cast('string')).to.equal('string');
    });

    it('Handles objects', () => {
      expect(string.cast({
        test: 5
      })).to.equal(JSON.stringify({
        test: 5
      }));
    });

    it('Correctly handles falsy values', () => {
      expect(string.cast(null)).to.be.null;
      expect(string.cast()).to.be.null;
      expect(string.cast(0)).to.equal('0');
      expect(string.cast('')).to.equal('');
      expect(string.cast(false)).to.equal('false');
    });
  });

  describe('#isValid()', () => {
    let string;

    beforeEach(() => {
      string = new String(10);
    });

    it('Ignores nils', () => {
      expect(string.isValid()).to.be.ok;
      expect(string.isValid(null)).to.be.ok;
    });

    it('Handles things that can be a string', () => {
      expect(string.isValid(false)).to.be.ok;
      expect(string.isValid(true)).to.be.ok;
      expect(string.isValid(5)).to.be.ok;
      expect(string.isValid('test')).to.be.ok;
      expect(string.isValid({
        test: 5
      })).to.be.ok;
    });

    it('Rejects values that are too long', () => {
      expect(string.isValid('a'.repeat(11))).not.to.be.ok;
    });
  });
});
