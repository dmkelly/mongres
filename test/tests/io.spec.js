const helpers = require('../helpers');
const { Mongres, Schema } = require('../../src');

describe('I/O', () => {
  let mongres;
  let Widget;

  beforeEach(async () => {
    await helpers.table.dropTables();

    mongres = new Mongres();
    Widget = mongres.model('Widget', new Schema({
      height: {
        type: Schema.Types.Integer()
      }
    }));

    await mongres.connect(helpers.connectionInfo);
  });

  afterEach(() => {
    return mongres.disconnect();
  });

  describe('#save()', () => {
    it('Inserts new records', async () => {
      const widget = new Widget({
        height: 5
      });
      const resource = await widget.save();
      expect(resource.id).to.equal(1);
      const row = await helpers.query.findOne(Widget.tableName, {
        id: resource.id
      });
      expect(row.height).to.equal(5);
      expect(row.id).to.equal(1);
    });

    describe('When the record already exists', () => {
      let widget;

      beforeEach(async () => {
        widget = new Widget({
          height: 5
        });
        widget = await widget.save();
      });

      it('Updates the existing record', async () => {
        widget.height = 8;
        await widget.save();
        const row = await helpers.query.findOne(Widget.tableName, {
          id: widget.id
        });
        expect(row.id).to.equal(1);
        expect(row.height).to.equal(8);
        const count = await helpers.query.count(Widget.tableName);
        expect(count).to.equal(1);
      });
    });
  });

  describe('#find()', () => {
    beforeEach(() => {
      return Promise.all([
        new Widget({
          height: 5
        }).save(),
        new Widget({
          height: 10
        }).save()
      ]);
    });

    it('Finds all items', async () => {
      const results = await Widget.find();
      expect(results.length).to.equal(2);
      expect(results[0]).to.be.instanceof(Widget);
      expect(results[1]).to.be.instanceof(Widget);
    });

    it('Supports filters', async () => {
      const results = await Widget.find({
        height: 5
      });
      expect(results.length).to.equal(1);
    });

    it('Handles empty result sets', async () => {
      const results = await Widget.find({
        height: 2
      });
      expect(results.length).to.equal(0);
    });

    it('Ignores invalid filters', async () => {
      const results = await Widget.find({
        badField: 100
      });
      expect(results.length).to.equal(2);
    });
  });

  describe('#findOne()', () => {
    beforeEach(() => {
      return Promise.all([
        new Widget({
          height: 5
        }).save(),
        new Widget({
          height: 10
        }).save()
      ]);
    });

    it('Finds the first matching item', async () => {
      const result = await Widget.findOne();
      expect(result).to.be.instanceof(Widget);
    });

    it('Supports filters', async () => {
      const result = await Widget.findOne({
        height: 5
      });
      expect(result).to.be.instanceof(Widget);
    });

    it('Handles no results', async () => {
      const result = await Widget.findOne({
        height: 2
      });
      expect(result).not.to.be.ok;
    });

    it('Ignores invalid filters', async () => {
      const result = await Widget.findOne({
        badField: 100
      });
      expect(result).to.be.instanceof(Widget);
    });
  });

  describe('#findById()', () => {
    let widgetA;
    let widgetB;

    beforeEach(async () => {
      widgetA = await new Widget({
        height: 5
      }).save();
      widgetB = await new Widget({
        height: 10
      }).save();
    });

    it('Finds the item by ID', async () => {
      let resultA = await Widget.findById(widgetA.id);
      expect(resultA.id).to.equal(widgetA.id);
      expect(resultA.height).to.equal(widgetA.height);

      let resultB = await Widget.findById(widgetB.id);
      expect(resultB.id).to.equal(widgetB.id);
      expect(resultB.height).to.equal(widgetB.height);
    });

    it('Handles when the ID has no match', async () => {
      const result = await Widget.findById(7);
      expect(result).not.to.be.ok;
    });

    it('Casts the ID to the correct type', async () => {
      const result = await Widget.findById(`${widgetA.id}`);
      expect(result.id).to.equal(widgetA.id);
    });
  });
});
