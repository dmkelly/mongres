const helpers = require('./helpers');
const { Mongres } = require('../src');

describe('index', () => {
  let mongres;

  beforeEach(() => {
    mongres = new Mongres();
  });

  describe('#connect()', () => {
    afterEach(() => {
      return mongres.disconnect();
    });

    it('Connects to a database', () => {
      return mongres.connect(helpers.connectionInfo)
        .then(() => mongres.client.raw('select current_time'))
        .then((result) => {
          expect(result.rowCount).to.equal(1);
        });
    });
  });
});
