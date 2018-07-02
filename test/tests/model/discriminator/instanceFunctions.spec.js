const sinon = require('sinon');
const helpers = require('../../../helpers');
const { Mongres, Schema } = require('../../../../src');

describe('model/discriminator/instanceFunctions', () => {
  let mongres;
  let Shape;
  let Rectangle;
  let Point;
  let preRemoveMiddleware;
  let postRemoveMiddleware;
  let preSaveMiddleware;

  beforeEach(async () => {
    await helpers.table.dropTables();

    preRemoveMiddleware = sinon.spy();
    postRemoveMiddleware = sinon.spy();
    preSaveMiddleware = sinon.spy();

    mongres = new Mongres();

    Point = mongres.model(
      'Point',
      new Schema({
        x: {
          type: Schema.Types.Integer()
        },
        y: {
          type: Schema.Types.Integer()
        }
      })
    );

    const shapeSchema = new Schema({
      area: {
        type: Schema.Types.Integer()
      },
      coord: {
        type: Schema.Types.Integer(),
        ref: 'Point'
      }
    });

    const rectangleSchema = new Schema({
      height: {
        type: Schema.Types.Integer()
      },
      width: {
        required: true,
        type: Schema.Types.Integer()
      },
      otherCoord: {
        type: Schema.Types.Integer(),
        ref: 'Point'
      }
    });

    shapeSchema.pre('save', preSaveMiddleware);
    rectangleSchema.pre('remove', preRemoveMiddleware);
    rectangleSchema.post('remove', postRemoveMiddleware);

    Shape = mongres.model('Shape', shapeSchema);
    Rectangle = Shape.discriminator('Rectangle', rectangleSchema);

    await mongres.connect(helpers.connectionInfo);
  });

  afterEach(() => {
    return mongres.disconnect();
  });

  describe('#populate()', () => {
    let coord1;
    let coord2;
    let rectangle;

    beforeEach(async () => {
      coord1 = new Point({
        x: 1,
        y: 2
      });
      coord2 = new Point({
        x: 3,
        y: 4
      });

      await coord1.save();
      await coord2.save();

      rectangle = new Rectangle({
        height: 3,
        width: 4,
        area: 12,
        coord: coord1.id,
        otherCoord: coord2.id
      });

      await rectangle.save();
    });

    it('Attaches the ref from the child to the document', async () => {
      expect(rectangle.otherCoord).to.equal(coord2.id);
      await rectangle.populate('otherCoord');
      expect(rectangle.otherCoord).to.be.instanceof(Point);
      expect(rectangle.otherCoord.toObject()).to.deep.equal(coord2.toObject());
    });

    it('Attaches the ref from the parent to the document', async () => {
      expect(rectangle.coord).to.equal(coord1.id);
      await rectangle.populate('coord');
      expect(rectangle.coord).to.be.instanceof(Point);
      expect(rectangle.coord.toObject()).to.deep.equal(coord1.toObject());
    });
  });

  describe('#remove()', () => {
    let rectangle;

    beforeEach(async () => {
      rectangle = new Rectangle({
        height: 3,
        width: 4,
        area: 12
      });

      await rectangle.save();
    });

    it('Deletes the document', async () => {
      await rectangle.remove();
      const row = await helpers.query.findOne(Rectangle.tableName, {
        id: rectangle.id
      });
      expect(row).not.to.be.ok;
    });

    it('Deletes from the parent schema table', async () => {
      await rectangle.remove();
      const row = await helpers.query.findOne(Shape.tableName, {
        type: rectangle.type
      });
      expect(row).not.to.be.ok;
    });

    it('Triggers pre middleware', async () => {
      expect(preRemoveMiddleware.called).not.to.be.ok;
      await rectangle.remove();
      expect(preRemoveMiddleware.called).to.be.ok;
    });

    it('Triggers post middleware', async () => {
      expect(postRemoveMiddleware.called).not.to.be.ok;
      await rectangle.remove();
      expect(postRemoveMiddleware.called).to.be.ok;
    });
  });

  describe('#save()', () => {
    let rectangle;

    beforeEach(() => {
      rectangle = new Rectangle({
        height: 3,
        width: 4,
        area: 12
      });
    });

    it('Calls the pre-save middleware of the parent on save', async () => {
      await rectangle.save();
      expect(preSaveMiddleware.called).to.be.ok;
      expect(preSaveMiddleware.getCalls().length).to.equal(1);
    });
  });
});
