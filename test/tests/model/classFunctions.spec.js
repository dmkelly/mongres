const helpers = require('../../helpers');
const { error, Mongres, Schema } = require('../../../src');

describe('model/classFunctions', () => {
  let mongres;
  let Widget;

  beforeEach(async () => {
    await helpers.table.dropTables();

    mongres = new Mongres();

    Widget = mongres.model(
      'Widget',
      new Schema({
        height: {
          type: Schema.Types.Integer()
        }
      })
    );
  });

  afterEach(() => {
    return mongres.disconnect();
  });

  describe('#create()', () => {
    let Square;

    beforeEach(async () => {
      Square = mongres.model(
        'Square',
        new Schema({
          height: {
            type: Schema.Types.Integer()
          },
          width: {
            required: true,
            type: Schema.Types.Integer()
          }
        })
      );

      await mongres.connect(helpers.connectionInfo);
    });

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
      expect(
        Square.create({
          height: 5
        })
      ).to.be.rejectedWith(error.ValidationError);

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
        expect(
          Widget.create({
            id: existing.id,
            height: 2
          })
        ).to.be.rejectedWith(error.ConflictError);
      });
    });
  });

  describe('#discriminator()', () => {
    let Gadget;

    beforeEach(async () => {
      Gadget = Widget.discriminator(
        'Gadget',
        new Schema({
          weight: {
            type: Schema.Types.Integer()
          }
        })
      );
      await mongres.connect(helpers.connectionInfo);
    });

    it('Creates a subclass of the parent', () => {
      const gadget = new Gadget();
      expect(gadget).to.be.instanceof(Gadget);
      expect(gadget).to.be.instanceof(Widget);
    });

    it('Adds the discriminator model to the instance models collection', () => {
      expect(mongres.model('Gadget')).to.be.ok;
      expect(mongres.model('Gadget')).to.equal(Gadget);
    });
  });

  describe('#find()', () => {
    beforeEach(async () => {
      await mongres.connect(helpers.connectionInfo);
      await Promise.all([
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

    it('Supports $ filters', async () => {
      const results = await Widget.find({
        height: {
          $in: [5]
        }
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
    beforeEach(async () => {
      await mongres.connect(helpers.connectionInfo);
      await Promise.all([
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
    let Item;
    let widgetA;
    let widgetB;
    let itemA;

    beforeEach(async () => {
      Item = mongres.model(
        'Item',
        new Schema({
          name: {
            type: Schema.Types.String()
          },
          widget: {
            type: Schema.Types.Integer(),
            ref: 'Widget'
          }
        })
      );

      await mongres.connect(helpers.connectionInfo);
      widgetA = await new Widget({
        height: 5
      }).save();
      widgetB = await new Widget({
        height: 10
      }).save();
      itemA = await new Item({
        name: 'test',
        widget: widgetA.id
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

    it('Supports chaining', async () => {
      const result = await Item.findById(itemA.id).populate('widget');
      expect(result.id).to.equal(itemA.id);
      expect(result.name).to.equal(itemA.name);
      expect(result.widget).to.be.instanceof(Widget);
    });

    it('Throws an error when called on a field that cannot populate', () => {
      expect(() => Item.find().populate('name')).to.throw(Error);
    });
  });

  describe('#remove()', () => {
    beforeEach(async () => {
      await mongres.connect(helpers.connectionInfo);
      await Promise.all([
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
      const count = await Widget.count();
      expect(count).to.equal(0);
    });

    it('Removes only items matching the filters', async () => {
      await Widget.remove({
        height: 10
      });
      const count = await Widget.count();
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
