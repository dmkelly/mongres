const helpers = require('../helpers');
const { Model, Mongres, Schema } = require('../../src');

describe('Mongres', () => {
  let mongres;

  beforeEach(async () => {
    await helpers.table.dropTables();

    const schema = new Schema({
      testField: {
        type: Schema.Types.Integer()
      }
    });
    mongres = new Mongres();
    mongres.model('ConnectTest', schema);
  });

  describe('#connect()', () => {
    afterEach(() => {
      return mongres.disconnect();
    });

    it('Connects to a database', async () => {
      await mongres.connect(helpers.connectionInfo);
      const result = await mongres.client.raw('select current_time');
      expect(result.rowCount).to.equal(1);
    });

    it('Creates tables for each model', async () => {
      const queryString =
        'SELECT tablename FROM pg_catalog.pg_tables' +
        ` WHERE schemaname='${mongres.namespace}'`;

      await mongres.connect(helpers.connectionInfo);
      const result = await mongres.client.raw(queryString);
      expect(result.rowCount).to.equal(1);
      expect(result.rows[0].tablename).to.equal('connecttest');
    });

    it('Handles reconnections', async () => {
      await mongres.connect(helpers.connectionInfo);
      await mongres.disconnect();
      await mongres.connect(helpers.connectionInfo);
    });

    it('Indicates that it is not connected before connection', () => {
      expect(mongres.isConnected).to.equal(false);
    });

    it('Indicates that it is connected after connection', async () => {
      await mongres.connect(helpers.connectionInfo);
      expect(mongres.isConnected).to.equal(true);
    });

    it('Indicates that it is not connected after disconnection', async () => {
      await mongres.connect(helpers.connectionInfo);
      await mongres.disconnect();
      expect(mongres.isConnected).to.equal(false);
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
