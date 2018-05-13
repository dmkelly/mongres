const utils = require('../../src/utils');

describe('utils', () => {
  describe('#isUndefined()', () => {
    it('Identifies when a value is undefined', () => {
      expect(utils.isUndefined()).to.be.ok;
    });

    it('Identifies when a value is not undefined', () => {
      expect(utils.isUndefined(null)).not.to.be.ok;
      expect(utils.isUndefined('')).not.to.be.ok;
      expect(utils.isUndefined(0)).not.to.be.ok;
      expect(utils.isUndefined(true)).not.to.be.ok;
      expect(utils.isUndefined(false)).not.to.be.ok;
      expect(utils.isUndefined([])).not.to.be.ok;
      expect(utils.isUndefined({})).not.to.be.ok;
    });
  });

  describe('#pick()', () => {
    it('Selects only selected properties of an object', () => {
      const object = {
        a: 0,
        b: 1,
        c: 'test',
        d: '',
        e: null
      };
      expect(utils.pick(object, ['a', 'b', 'c', 'd', 'e'])).to.deep.equal(object);
      expect(utils.pick(object, ['a', 'c', 'd'])).to.deep.equal({
        a: 0,
        c: 'test',
        d: ''
      });
      expect(utils.pick(object, ['bad', 'c'])).to.deep.equal({
        c: 'test'
      });
    });
  });
});
