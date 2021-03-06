const helpers = require('../../helpers');
const { Mongres, Schema } = require('../../../src');

describe('model/path', () => {
  let mongres;
  let schema;

  beforeEach(async () => {
    await helpers.table.dropTables();

    mongres = new Mongres();
    schema = new Schema({
      testValue: {
        type: Schema.Types.Integer()
      }
    });
  });

  describe('#get()', () => {
    let Model;

    beforeEach(async () => {
      schema.path('testValue').get(function(value) {
        return value + 1;
      });
      Model = mongres.model('Test', schema);
      await mongres.connect(helpers.connectionInfo);
    });

    afterEach(() => {
      return mongres.disconnect();
    });

    it('Provides a custom getter for a field', () => {
      const document = new Model({
        testValue: 5
      });
      expect(document.testValue).to.equal(6);
    });

    it('Persists the actual value to the database', async () => {
      const document = new Model({
        testValue: 5
      });
      await document.save();
      const records = await helpers.query.find(Model.tableName);
      expect(records[0].testValue).to.equal(5);
    });

    it('Applies the custom getter for the field in #toObject()', () => {
      const document = new Model({
        testValue: 5
      });
      expect(document.toObject().testValue).to.equal(6);
    });
  });

  describe('#set()', () => {
    let Model;

    beforeEach(async () => {
      schema.path('testValue').set(function(value) {
        return value + 1;
      });
      Model = mongres.model('Test', schema);
      await mongres.connect(helpers.connectionInfo);
    });

    afterEach(() => {
      return mongres.disconnect();
    });

    it('Provides a custom setter for a field', () => {
      const document = new Model({
        testValue: 5
      });
      document.testValue = 8;
      expect(document.testValue).to.equal(9);
    });

    it('Applies the custom setter on create', () => {
      const document = new Model({
        testValue: 5
      });
      expect(document.testValue).to.equal(6);
    });

    it('Persists the setter value to the database', async () => {
      const document = new Model({
        testValue: 5
      });
      document.testValue = 8;
      await document.save();
      const records = await helpers.query.find(Model.tableName);
      expect(records[0].testValue).to.equal(9);
    });

    it('Does not apply the setter on retrieval from database', async () => {
      const document = new Model({
        testValue: 5
      });
      await document.save();
      const retrieved = await Model.findById(document.id);
      expect(retrieved.testValue).to.equal(6);
    });

    it('Applies setters correctly on #create()', async () => {
      const document = await Model.create({
        testValue: 5
      });
      const retrieved = await Model.findById(document.id);
      expect(retrieved.testValue).to.equal(6);
    });
  });

  describe('Chaining', () => {
    let Model;

    beforeEach(async () => {
      schema
        .path('testValue')
        .set(function(value) {
          return value + 1;
        })
        .get(function(value) {
          return value - 1;
        });
      Model = mongres.model('Test', schema);
      await mongres.connect(helpers.connectionInfo);
    });

    afterEach(() => {
      return mongres.disconnect();
    });

    it('Allows chaining of setters and getters', () => {
      const document = new Model({
        testValue: 5
      });
      expect(document.testValue).to.equal(5);
    });
  });

  describe('Separate applications', () => {
    let Model;

    beforeEach(async () => {
      schema.path('testValue').set(function(value) {
        return value + 1;
      });
      schema.path('testValue').get(function(value) {
        return value - 1;
      });
      Model = mongres.model('Test', schema);
      await mongres.connect(helpers.connectionInfo);
    });

    afterEach(() => {
      return mongres.disconnect();
    });

    it('Allows application of both getters and setters separately', () => {
      const document = new Model({
        testValue: 5
      });
      expect(document.testValue).to.equal(5);
    });
  });
});
