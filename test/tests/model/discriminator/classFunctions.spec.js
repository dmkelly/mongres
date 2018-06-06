const helpers = require('../../../helpers');
const { error, Mongres, Schema } = require('../../../../src');

describe('model/discriminator/classFunctions', () => {
  let mongres;
  let Shape;
  let Rectangle;
  let Circle;

  beforeEach(async () => {
    await helpers.table.dropTables();

    mongres = new Mongres();

    Shape = mongres.model(
      'Shape',
      new Schema({
        area: {
          type: Schema.Types.Integer()
        }
      })
    );

    Rectangle = Shape.discriminator(
      'Rectangle',
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

    Circle = Shape.discriminator(
      'Circle',
      new Schema({
        diameter: {
          required: true,
          type: Schema.Types.Integer()
        }
      })
    );

    await mongres.connect(helpers.connectionInfo);
  });

  afterEach(() => {
    return mongres.disconnect();
  });

  describe('#create()', () => {
    it('Inserts a new record in both the base and child tables', async () => {
      await Rectangle.create({
        area: 6,
        height: 2,
        width: 3
      });
      const shapeRecords = await helpers.query.find(Shape.tableName);
      const rectangleRecords = await helpers.query.find(Rectangle.tableName);
      expect(shapeRecords.length).to.equal(1);
      expect(shapeRecords[0].area).to.equal(6);
      expect(rectangleRecords.length).to.equal(1);
      expect(rectangleRecords[0].height).to.equal(2);
      expect(rectangleRecords[0].width).to.equal(3);
    });

    it('Returns the created document', async () => {
      const rectangle = await Rectangle.create({
        area: 6,
        height: 2,
        width: 3
      });
      expect(rectangle).to.be.instanceof(Rectangle);
      expect(rectangle.id).to.equal(1);
      expect(rectangle.area).to.equal(6);
      expect(rectangle.height).to.equal(2);
      expect(rectangle.width).to.equal(3);
    });

    it('Uses the ID from the parent table in both the parent and child tables', async () => {
      const rectangle = await new Rectangle({
        height: 10,
        width: 4,
        area: 40
      }).save();
      const circle = await new Circle({
        area: 40,
        diameter: Math.round(40 / (2 * Math.PI))
      }).save();

      expect(rectangle.id).to.equal(1);
      expect(circle.id).to.equal(2);
    });

    it('Validates before saving', async () => {
      expect(
        Rectangle.create({
          height: 5,
          area: 5
        })
      ).to.be.rejectedWith(error.ValidationError);

      const records = await helpers.query.find(Rectangle.tableName);
      expect(records.length).to.equal(0);
    });

    describe('When there is a conflict', () => {
      let existing;

      beforeEach(async () => {
        existing = await Rectangle.create({
          height: 7,
          width: 5,
          area: 35
        });
      });

      it('Throws a ConflictError', () => {
        expect(
          Rectangle.create({
            id: existing.id,
            height: 2,
            width: 4,
            area: 8
          })
        ).to.be.rejectedWith(error.ConflictError);
      });
    });
  });

  describe('#find()', () => {
    let rect1;
    let circle1;

    beforeEach(async () => {
      rect1 = await new Rectangle({
        height: 5,
        width: 1,
        area: 5
      }).save();
      await new Rectangle({
        height: 10,
        width: 4,
        area: 40
      }).save();
      circle1 = await new Circle({
        area: 40,
        diameter: Math.round(40 / (2 * Math.PI))
      }).save();
    });

    it('Finds all items', async () => {
      const results = await Rectangle.find();
      expect(results.length).to.equal(2);
      expect(results[0]).to.be.instanceof(Rectangle);
      expect(results[1]).to.be.instanceof(Rectangle);
    });

    it('Includes all fields', async () => {
      const results = await Rectangle.find();
      expect(results.length).to.equal(2);
      expect(results[0]).to.be.instanceof(Rectangle);
      expect(results[1]).to.be.instanceof(Rectangle);
      expect(results[0].height).to.be.a('number');
      expect(results[0].width).to.be.a('number');
      expect(results[0].area).to.be.a('number');
      expect(results[1].height).to.be.a('number');
      expect(results[1].width).to.be.a('number');
      expect(results[1].area).to.be.a('number');
    });

    it('Supports filters', async () => {
      const results = await Rectangle.find({
        height: 5
      });
      expect(results.length).to.equal(1);
    });

    it('Supports filters on the parent schema', async () => {
      const results = await Rectangle.find({
        area: 40
      });
      expect(results.length).to.equal(1);
    });

    it('Handles empty result sets', async () => {
      const results = await Rectangle.find({
        height: 2
      });
      expect(results.length).to.equal(0);
    });

    it('Ignores invalid filters', async () => {
      const results = await Rectangle.find({
        badField: 100
      });
      expect(results.length).to.equal(2);
    });

    it('Supports chaining', async () => {
      const results = await Rectangle.find()
        .where({
          height: 5
        })
        .limit(3)
        .sort('-height');
      expect(results.length).to.equal(1);
    });

    it('Parent model can find all children', async () => {
      const results = await Shape.find();
      expect(results.length).to.equal(3);
    });

    it('Parent model casts to child type', async () => {
      const results = await Shape.find();
      const foundRect1 = results.find(shape => shape.id === rect1.id);
      const foundCircle1 = results.find(shape => shape.id === circle1.id);
      expect(foundRect1).to.be.ok;
      expect(foundRect1).to.be.instanceof(Rectangle);
      expect(foundCircle1).to.be.ok;
      expect(foundCircle1).to.be.instanceof(Circle);
    });

    it('Parent model queries include child-specific properties', async () => {
      const results = await Shape.find();
      const foundRect1 = results.find(shape => shape.id === rect1.id);
      const foundCircle1 = results.find(shape => shape.id === circle1.id);
      expect(foundRect1).to.be.ok;
      expect(foundRect1.height).to.equal(5);
      expect(foundRect1.width).to.equal(1);
      expect(foundRect1.area).to.equal(5);
      expect(foundCircle1).to.be.ok;
      expect(foundCircle1.height).not.to.be.ok;
      expect(foundCircle1.area).to.equal(40);
      expect(foundCircle1.diameter).to.equal(6);
    });
  });

  describe('#findOne()', () => {
    beforeEach(() => {
      return Promise.all([
        new Rectangle({
          height: 5,
          width: 2,
          area: 10
        }).save(),
        new Rectangle({
          height: 10,
          width: 4,
          area: 40
        }).save(),
        new Circle({
          area: 40,
          diameter: Math.round(40 / (2 * Math.PI))
        }).save()
      ]);
    });

    it('Finds the first matching item', async () => {
      const result = await Rectangle.findOne();
      expect(result).to.be.instanceof(Rectangle);
      expect(result).to.be.instanceof(Shape);
    });

    it('Supports filters', async () => {
      const result = await Rectangle.findOne({
        height: 5
      });
      expect(result).to.be.instanceof(Rectangle);
    });

    it('Handles no results', async () => {
      const result = await Rectangle.findOne({
        height: 2
      });
      expect(result).not.to.be.ok;
    });

    it('Ignores invalid filters', async () => {
      const result = await Rectangle.findOne({
        diameter: 6
      });
      expect(result).to.be.instanceof(Rectangle);
    });

    it('Supports chaining', async () => {
      const result = await Rectangle.findOne()
        .where({
          height: 5
        })
        .sort('-height');
      expect(result).to.be.instanceof(Rectangle);
    });
  });

  describe('#findById()', () => {
    let rectangleA;
    let rectangleB;

    beforeEach(async () => {
      rectangleA = await new Rectangle({
        height: 5,
        width: 2,
        area: 10
      }).save();
      rectangleB = await new Rectangle({
        height: 10,
        width: 4,
        area: 40
      }).save();
      await new Circle({
        area: 40,
        diameter: Math.round(40 / (2 * Math.PI))
      }).save();
    });

    it('Finds the item by ID', async () => {
      let resultA = await Rectangle.findById(rectangleA.id);
      expect(resultA.id).to.equal(rectangleA.id);
      expect(resultA.height).to.equal(rectangleA.height);

      let resultB = await Rectangle.findById(rectangleB.id);
      expect(resultB.id).to.equal(rectangleB.id);
      expect(resultB.height).to.equal(rectangleB.height);
    });

    it('Handles when the ID has no match', async () => {
      const result = await Rectangle.findById(7);
      expect(result).not.to.be.ok;
    });

    it('Casts the ID to the correct type', async () => {
      const result = await Rectangle.findById(`${rectangleA.id}`);
      expect(result.id).to.equal(rectangleA.id);
    });
  });

  describe('#remove()', () => {
    beforeEach(() => {
      return Promise.all([
        new Rectangle({
          height: 5,
          width: 1,
          area: 5
        }).save(),
        new Rectangle({
          height: 10,
          width: 4,
          area: 40
        }).save(),
        new Circle({
          area: 40,
          diameter: Math.round(40 / (2 * Math.PI))
        }).save()
      ]);
    });

    it('Can remove multiple items at once', async () => {
      await Rectangle.remove({});
      const rectangleCount = await helpers.query.count(Rectangle.tableName);
      expect(rectangleCount).to.equal(0);
      const parentCount = await helpers.query.count(Shape.tableName);
      expect(parentCount).to.equal(1);
    });

    it('Removes only items matching the filters', async () => {
      await Rectangle.remove({
        height: 10
      });
      const count = await helpers.query.count(Rectangle.tableName);
      expect(count).to.equal(1);

      const removedItem = await Rectangle.findOne({
        height: 10
      });
      expect(removedItem).not.to.be.ok;

      const remainingItem = await Rectangle.findOne({
        height: 5
      });
      expect(remainingItem).to.be.ok;
    });

    it('Removes items when criteria span ancestors', async () => {
      await Rectangle.remove({
        area: 40
      });
      const count = await helpers.query.count(Rectangle.tableName);
      expect(count).to.equal(1);

      const removedItem = await Rectangle.findOne({
        height: 10
      });
      expect(removedItem).not.to.be.ok;

      const remainingItem = await Rectangle.findOne({
        height: 5
      });
      expect(remainingItem).to.be.ok;

      const circleCount = await helpers.query.count(Circle.tableName);
      expect(circleCount).to.equal(1);
    });
  });
});
