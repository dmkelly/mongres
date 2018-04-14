const helpers = require('../helpers');
const { Model, Mongres, Schema } = require('../../src');

describe('Mongres', () => {
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

  describe('#model()', () => {
    let schema;

    beforeEach(() => {
      schema = new Schema({
        testField: {
          type: Schema.Types.Integer()
        }
      });
    });

    it('Creates a model from a schema', () => {
      const key = 'Test';
      const TestModel = mongres.model(key, schema);
      expect(new TestModel()).to.be.instanceOf(Model);
    });

    it('Retrieves a model', () => {
      const key = 'Test';
      const TestModel = mongres.model(key, schema);
      const RetrievedModel = mongres.model(key);
      expect(RetrievedModel).to.equal(TestModel);
    });

    it('Throws an error if the model does not exist', () => {
      expect(() => mongres.model('Bad')).to.throw(Error);
    });
  });
});
