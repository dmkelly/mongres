const utils = require('../../src/utils');

describe('utils', () => {
  describe('#tempate()', () => {
    it('Replaces parts of a string', () => {
      expect(
        utils.template('the value is {value}', {
          value: 5
        })
      ).to.equal('the value is 5');
    });

    it('Replaces multiple occurrances', () => {
      expect(
        utils.template('{value}{value}value{value}', {
          value: 5
        })
      ).to.equal('55value5');
    });

    it('Handles multiple replacements', () => {
      expect(
        utils.template('{field} = {value}', {
          field: 'height',
          value: 5
        })
      ).to.equal('height = 5');
    });
  });
});
