const helpers = require('../../helpers');
const { error, Mongres, Schema } = require('../../../src');

describe('model/classFunctions', () => {
  let mongres;
  let Square;
  let Widget;
  let Gadget;

  beforeEach(async () => {
    await helpers.table.dropTables();

    mongres = new Mongres();
    Square = mongres.model('Square', new Schema({
      height: {
        type: Schema.Types.Integer()
      },
      width: {
        required: true,
        type: Schema.Types.Integer()
      }
    }));
    Widget = mongres.model('Widget', new Schema({
      height: {
        type: Schema.Types.Integer()
      }
    }));
    Gadget = Widget.discriminator('Gadget', new Schema({
      weight: {
        type: Schema.Types.Integer()
      }
    }));

    await mongres.connect(helpers.connectionInfo);
  });

  afterEach(() => {
    return mongres.disconnect();
  });

  describe('#create()', () => {
    it('Inserts a new record', async () => {
      await Widget.create({
        height: 7
      });
      const records = await helpers.query.find(Widget.tableName);
      expect(records.length).to.equal(1);
    });

    it('Returns the created document', async () => {
      const widget = await Widget.create({
        height: 7
      });
      expect(widget).to.be.instanceof(Widget);
      expect(widget.id).to.equal(1);
    });

    it('Validates before saving', async () => {
      expect(Square.create({
        height: 5
      })).to.be.rejectedWith(error.ValidationError);

      const records = await helpers.query.find(Square.tableName);
      expect(records.length).to.equal(0);
    });

    describe('When there is a conflict', () => {
      let existing;

      beforeEach(async () => {
        existing = await Widget.create({
          height: 7
        });
      });

      it('Throws a ConflictError', () => {
        expect(Widget.create({
          id: existing.id,
          height: 2
        })).to.be.rejectedWith(error.ConflictError);
      });
    });
  });

  describe('#discriminator()', () => {
    it('Creates a subclass of the parent', () => {
      const gadget = new Gadget();
      expect(gadget).to.be.instanceof(Gadget);
      expect(gadget).to.be.instanceof(Widget);
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

    it('Supports chaining', async () => {
      const results = await Widget.find()
        .where({
          height: 5
        })
        .limit(3)
        .sort('-height');
      expect(results.length).to.equal(1);
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

    it('Supports chaining', async () => {
      const result = await Widget.findOne()
        .where({
          height: 5
        })
        .sort('-height');
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

  describe('#remove()', () => {
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

    it('Can remove multiple items at once', async () => {
      await Widget.remove({});
      const count = await helpers.query.count(Widget.tableName);
      expect(count).to.equal(0);
    });

    it('Removes only items matching the filters', async () => {
      await Widget.remove({
        height: 10
      });
      const count = await helpers.query.count(Widget.tableName);
      expect(count).to.equal(1);

      const removedItem = await Widget.findOne({
        height: 10
      });
      expect(removedItem).not.to.be.ok;

      const remainingItem = await Widget.findOne({
        height: 5
      });
      expect(remainingItem).to.be.ok;
    });
  });
});
