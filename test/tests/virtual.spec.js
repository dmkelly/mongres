const helpers = require('../helpers');
const { Mongres, Schema } = require('../../src');

describe('virtuals', () => {
  let mongres;
  let schema;

  beforeEach(async () => {
    await helpers.table.dropTables();

    mongres = new Mongres();
    schema = new Schema({
      testField: {
        type: Schema.Types.Integer()
      }
    });
  });

  describe('#get()', () => {
    let Model;

    beforeEach(() => {
      schema.virtual('testVirtual')
        .get(function () {
          return this.testField + 1;
        });
      Model = mongres.model('Test', schema);
    });

    it('Supports getters', () => {
      const instance = new Model({
        testField: 2
      });
      expect(instance.testVirtual).to.equal(3);
    });
  });

  describe('#set()', () => {
    let Model;

    beforeEach(() => {
      schema.virtual('testVirtual')
        .set(function (value) {
          this.testField = value + 5;
        });
      Model = mongres.model('Test', schema);
    });

    it('Supports setters', () => {
      const instance = new Model({
        testField: 2
      });
      instance.testVirtual = 3;
      expect(instance.testField).to.equal(8);
    });
  });

  describe('#get() and #set()', () => {
    let Model;

    beforeEach(() => {
      schema.virtual('testVirtual')
        .get(function () {
          return this.testField + 1;
        })
        .set(function (value) {
          this.testField = value + 5;
        });
      Model = mongres.model('Test', schema);
    });

    it('Supports getters and setters', () => {
      const instance = new Model({
        testField: 2
      });
      instance.testVirtual = 3;

      expect(instance.testField).to.equal(8);
      expect(instance.testVirtual).to.equal(9);
    });
  });
});
