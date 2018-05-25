const sinon = require('sinon');
const helpers = require('../../helpers');
const { Mongres, Schema, error } = require('../../../src');

describe('model/instanceFunctions', () => {
  let mongres;
  let Square;
  let Widget;
  let Point;
  let Line;
  let preRemoveMiddleware;
  let postRemoveMiddleware;
  let preSaveMiddleware;
  let postSaveMiddleware;
  let preValidateMiddleware;
  let postValidateMiddleware;

  beforeEach(async () => {
    await helpers.table.dropTables();

    mongres = new Mongres();
    preRemoveMiddleware = sinon.spy();
    postRemoveMiddleware = sinon.spy();
    preSaveMiddleware = sinon.spy();
    postSaveMiddleware = sinon.spy();
    preValidateMiddleware = sinon.spy();
    postValidateMiddleware = sinon.spy();

    const widgetSchema = new Schema({
      height: {
        type: Schema.Types.Integer()
      }
    });

    const squareSchema = new Schema({
      height: {
        type: Schema.Types.Integer()
      },
      width: {
        validate: {
          message: 'invalid width: {VALUE}',
          validator: (value) => value > 0
        },
        required: true,
        type: Schema.Types.Integer()
      }
    });

    const pointSchema = new Schema({
      x: {
        type: Schema.Types.Integer()
      },
      y: {
        type: Schema.Types.Integer()
      }
    });

    const lineSchema = new Schema({
      start: {
        type: Schema.Types.Integer(),
        ref: 'Point'
      },
      end: {
        type: Schema.Types.Integer(),
        ref: 'Point'
      }
    });

    widgetSchema.pre('remove', preRemoveMiddleware);
    widgetSchema.post('remove', postRemoveMiddleware);
    widgetSchema.pre('save', preSaveMiddleware);
    widgetSchema.post('save', postSaveMiddleware);
    widgetSchema.pre('validate', preValidateMiddleware);
    widgetSchema.post('validate', postValidateMiddleware);

    Square = mongres.model('Square', squareSchema);
    Widget = mongres.model('Widget', widgetSchema);
    Point = mongres.model('Point', pointSchema);
    Line = mongres.model('Line', lineSchema);

    await mongres.connect(helpers.connectionInfo);
  });

  afterEach(() => {
    return mongres.disconnect();
  });

  describe('#populate()', () => {
    let start;
    let end;
    let line;

    beforeEach(async () => {
      start = new Point({
        x: 1,
        y: 2
      });
      end = new Point({
        x: 3,
        y: 4
      });
      await start.save();
      await end.save();
      line = new Line({
        start: start.id,
        end: end.id
      });
      await line.save();
    });

    it('Attaches the referenced record to the document', async () => {
      expect(line.start).to.equal(start.id);
      await line.populate('start');
      expect(line.start).to.be.instanceof(Point);
      expect(line.start.toObject()).to.deep.equal(start.toObject());
    });

    it('Handles populated fields when it saves', async () => {
      await line.populate('start');
      line.end = 6;
      await expect(line.save()).not.to.be.rejectedWith(error.ValidationError);
    });

    it('Handles populated fields when it validates', async () => {
      await line.populate('start');
      line.end = 6;
      await expect(line.validate()).not.to.be.rejectedWith(error.ValidationError);
    });
  });

  describe('#remove()', () => {
    let widgetA;
    let widgetB;

    beforeEach(async () => {
      widgetA = new Widget({
        height: 5
      });
      widgetB = new Widget({
        height: 7
      });
      await Promise.all([
        widgetA.save(),
        widgetB.save()
      ]);
    });

    it('Deletes the document', async () => {
      await widgetA.remove();
      const row = await helpers.query.findOne(Widget.tableName, {
        id: widgetA.id
      });
      expect(row).not.to.be.ok;
    });

    it('Does not delete other documents', async () => {
      await widgetA.remove();
      const row = await helpers.query.findOne(Widget.tableName, {
        id: widgetB.id
      });
      expect(row).to.be.ok;
    });

    it('Triggers pre middleware', async () => {
      expect(preRemoveMiddleware.called).not.to.be.ok;
      await widgetA.remove();
      expect(preRemoveMiddleware.called).to.be.ok;
    });

    it('Triggers post middleware', async () => {
      expect(postRemoveMiddleware.called).not.to.be.ok;
      await widgetA.remove();
      expect(postRemoveMiddleware.called).to.be.ok;
    });
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

    it('Triggers pre middleware', async () => {
      const widget = new Widget({
        height: 5
      });
      expect(preSaveMiddleware.called).not.to.be.ok;
      await widget.save();
      expect(preSaveMiddleware.called).to.be.ok;
    });

    it('Triggers post middleware', async () => {
      const widget = new Widget({
        height: 5
      });
      expect(postSaveMiddleware.called).not.to.be.ok;
      await widget.save();
      expect(postSaveMiddleware.called).to.be.ok;
    });

    it('Validates before saving', async () => {
      const square = new Square({
        height: 5
      });
      expect(square.save()).to.be.rejectedWith(error.ValidationError);

      const records = await helpers.query.find(Square.tableName);
      expect(records.length).to.equal(0);
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

      it('Triggers pre middleware', async () => {
        const widget = new Widget({
          height: 5
        });
        expect(preSaveMiddleware.calledOnce).to.be.ok;
        await widget.save();
        expect(preSaveMiddleware.calledTwice).to.be.ok;
      });

      it('Triggers post middleware', async () => {
        const widget = new Widget({
          height: 5
        });
        expect(postSaveMiddleware.calledOnce).to.be.ok;
        await widget.save();
        expect(postSaveMiddleware.calledTwice).to.be.ok;
      });
    });
  });

  describe('#toObject()', () => {
    it('Represents the model data as a plain object', () => {
      const square = new Square({
        height: 5,
        width: 10
      });
      expect(square.toObject()).to.deep.equal({
        height: 5,
        width: 10
      });
    });

    it('Returns a copy of the data', () => {
      const square = new Square({
        height: 5,
        width: 10
      });
      const data = square.toObject();
      data.height = 20;
      expect(square.height).to.equal(5);
    });

    it('Supports nested schemas', async () => {
      const start = new Point({
        x: 1,
        y: 2
      });
      const end = new Point({
        x: 3,
        y: 4
      });
      await start.save();
      await end.save();
      const line = new Line({
        start: start.id,
        end: end.id
      });
      await line.populate('start');
      await line.populate('end');
      expect(line.toObject()).to.deep.equal({
        start: {
          x: 1,
          y: 2,
          id: start.id
        },
        end: {
          x: 3,
          y: 4,
          id: end.id
        }
      });
    });
  });

  describe('#validate()', () => {
    it('Enforces required fields', () => {
      const square = new Square({
        height: 5
      });
      expect(square.validate()).to.be.rejectedWith(error.ValidationError);
    });

    it('Supports custom validator', () => {
      const square = new Square({
        height: 5,
        width: -1
      });

      return square.validate()
        .then(() => {
          return Promise.reject(new Error('Validation should have rejected'));
        })
        .catch((err) => {
          expect(err).to.be.instanceof(error.ValidationError);
          expect(err.details[0].message).to.equal('invalid width: -1');
        });
    });

    it('Triggers pre middleware', async () => {
      const widget = new Widget({
        height: 5
      });
      expect(preValidateMiddleware.called).not.to.be.ok;
      await widget.validate();
      expect(preValidateMiddleware.called).to.be.ok;
    });

    it('Triggers post middleware', async () => {
      const widget = new Widget({
        height: 5
      });
      expect(postValidateMiddleware.called).not.to.be.ok;
      await widget.validate();
      expect(postValidateMiddleware.called).to.be.ok;
    });
  });
});
