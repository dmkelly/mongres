const DateType = require('../../../src/types/date');

describe('types/Date', () => {
  let field;
  let now;

  beforeEach(() => {
    field = new DateType();
    now = new Date();
  });

  describe('#cast()', () => {
    it('Handles dates', () => {
      expect(field.cast(now).getTime()).to.equal(now.getTime());
    });

    it('Handles invalid dates', () => {
      expect(field.cast(new Date('asdfasf'))).to.be.undefined;
    });

    it('Handles numbers', () => {
      expect(field.cast(now.getTime()).getTime()).to.equal(now.getTime());
    });

    it('Handles numeric strings', () => {
      expect(field.cast(`${now.getTime()}`).getTime()).to.equal(now.getTime());
    });

    it('Handles timestamp strings', () => {
      expect(field.cast(now.toISOString()).getTime()).to.equal(now.getTime());
    });

    it('Prunes things that are not dates', () => {
      expect(field.cast({})).to.be.undefined;
      expect(field.cast(null)).to.be.undefined;
      expect(field.cast()).to.be.undefined;
      expect(field.cast('')).to.be.undefined;
      expect(field.cast(NaN)).to.be.undefined;
      expect(field.cast([])).to.be.undefined;
    });
  });

  describe('#isValid()', () => {
    it('Ignores nils', () => {
      expect(field.isValid()).to.be.ok;
      expect(field.isValid(null)).to.be.ok;
    });

    it('Handles things that can be a date', () => {
      expect(field.isValid(now)).to.be.ok;
      expect(field.isValid(now.getTime())).to.be.ok;
      expect(field.isValid(now.toISOString())).to.be.ok;
    });

    it('Handles things that are not dates', () => {
      expect(field.isValid('asdfasf')).not.to.be.ok;
      expect(field.isValid({})).not.to.be.ok;
      expect(field.isValid(true)).not.to.be.ok;
    });

    it('Handles invalid dates', () => {
      expect(field.isValid(new Date('asfafs'))).not.to.be.ok;
    });
  });

  describe('#isEqual()', () => {
    it('Handles nils', () => {
      expect(field.isEqual(null, null)).to.be.ok;
      expect(field.isEqual()).to.be.ok;
      expect(field.isEqual(new Date())).not.to.be.ok;
      expect(field.isEqual(null, new Date())).not.to.be.ok;
    });

    it('Handles dates', () => {
      expect(field.isEqual(new Date(0), new Date(1))).not.to.be.ok;
      expect(field.isEqual(new Date(5), new Date(5))).to.be.ok;
    });
  });
});
