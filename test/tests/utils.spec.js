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
});
