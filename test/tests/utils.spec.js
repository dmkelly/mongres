const utils = require('../../src/utils');

describe('utils', () => {
  describe('#isFunction()', () => {
    it('Identifies when a value is a function', () => {
      expect(utils.isFunction(() => {})).to.be.ok;
      expect(utils.isFunction(function () {})).to.be.ok;
    });

    it('Identifies when a value is not a function', () => {
      expect(utils.isFunction(null)).not.to.be.ok;
      expect(utils.isFunction('')).not.to.be.ok;
      expect(utils.isFunction(0)).not.to.be.ok;
      expect(utils.isFunction(true)).not.to.be.ok;
      expect(utils.isFunction(false)).not.to.be.ok;
      expect(utils.isFunction([])).not.to.be.ok;
      expect(utils.isFunction({})).not.to.be.ok;
    });
  });

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

  describe('#tempate()', () => {
    it('Replaces parts of a string', () => {
      expect(utils.template('the value is {value}', {
        value: 5
      })).to.equal('the value is 5');
    });

    it('Replaces multiple occurrances', () => {
      expect(utils.template('{value}{value}value{value}', {
        value: 5
      })).to.equal('55value5');
    });

    it('Handles multiple replacements', () => {
      expect(utils.template('{field} = {value}', {
        field: 'height',
        value: 5
      })).to.equal('height = 5');
    });
  });
});
