const sinon = require('sinon');
const helpers = require('../../helpers');
const { Mongres, Schema, error } = require('../../../src');

describe('model/instanceFunctions', () => {
  let mongres;

  beforeEach(async () => {
    await helpers.table.dropTables();

    mongres = new Mongres();
  });

  afterEach(() => {
    return mongres.disconnect();
  });

  describe('#isModified()', () => {
    let Point;
    let existingPoint;

    beforeEach(async () => {
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

      await mongres.connect(helpers.connectionInfo);

      existingPoint = await Point.create({
        x: 1,
        y: 2
      });
    });

    it('Ignores invalid fields', () => {
      expect(existingPoint.isModified('asdf')).to.equal(false);
    });

    it('Handles when the document is new', () => {
      const newPoint = new Point({
        x: 1,
        y: 2
      });
      expect(newPoint.isModified('x')).to.equal(true);
    });

    it('Handles when the field has not changed since loading', async () => {
      const point = await Point.findById(existingPoint.id);
      expect(point.isModified('x')).to.equal(false);
    });

    it('Handles when the field has changed since loading', async () => {
      const point = await Point.findById(existingPoint.id);
      point.x = 4;
      expect(point.isModified('x')).to.equal(true);
    });

    it('Resyncs values on save', async () => {
      existingPoint.x = 3;
      await existingPoint.save();
      expect(existingPoint.isModified('x')).to.equal(false);
    });
  });

  describe('#populate()', () => {
    describe('Basic scenarios', () => {
      let Point;
      let Line;
      let start;
      let end;
      let line;

      beforeEach(async () => {
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

        Line = mongres.model(
          'Line',
          new Schema({
            start: {
              type: Schema.Types.Integer(),
              ref: 'Point'
            },
            end: {
              type: Schema.Types.Integer(),
              ref: 'Point'
            }
          })
        );

        await mongres.connect(helpers.connectionInfo);

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
        await expect(line.validate()).not.to.be.rejectedWith(
          error.ValidationError
        );
      });

      it('Handles when the populated document does not exist', async () => {
        line.start = 1000;
        await line.populate('start');
        expect(line.start).to.equal(1000);
      });
    });

    describe('Complicated scenarios', () => {
      let NestedPoint;
      let Gadget;
      let Device;
      let device1;
      let gadget1;
      let device2;
      let gadget2;

      beforeEach(async () => {
        NestedPoint = mongres.model(
          'NestedPoint',
          new Schema({
            gadget: {
              type: Schema.Types.Integer(),
              ref: 'Gadget'
            },
            x: {
              type: Schema.Types.Integer()
            },
            y: {
              type: Schema.Types.Integer()
            }
          })
        );

        Gadget = mongres.model(
          'Gadget',
          new Schema({
            points: {
              type: [NestedPoint],
              attach: true
            },
            size: {
              type: Schema.Types.Integer()
            }
          })
        );

        Device = mongres.model(
          'Device',
          new Schema({
            name: {
              type: Schema.Types.String()
            },
            gadget: {
              type: Schema.Types.Integer(),
              ref: 'Gadget'
            }
          })
        );

        await mongres.connect(helpers.connectionInfo);

        gadget1 = await Gadget.create({
          points: [
            {
              x: 1,
              y: 2
            },
            {
              x: 3,
              y: 4
            }
          ],
          size: 2
        });

        gadget2 = await Gadget.create({
          points: [
            {
              x: 5,
              y: 6
            },
            {
              x: 7,
              y: 8
            }
          ],
          size: 2
        });

        device1 = await Device.create({
          name: 'a',
          gadget: gadget1.id
        });

        device2 = await Device.create({
          name: 'b',
          gadget: gadget2.id
        });
      });

      it('Handles nested documents on the populated field', async () => {
        const [a, b] = await Device.find()
          .populate('gadget')
          .sort('name', 1);
        expect(a.id).to.equal(device1.id);
        expect(b.id).to.equal(device2.id);
        expect(a.gadget).to.be.instanceof(Gadget);
        expect(a.gadget.points.length).to.equal(2);
        expect(a.gadget.points[0]).to.be.instanceof(NestedPoint);
        expect(a.gadget.points[1]).to.be.instanceof(NestedPoint);
      });
    });
  });

  describe('#remove()', () => {
    let Widget;
    let widgetA;
    let widgetB;
    let preRemoveMiddleware;
    let postRemoveMiddleware;

    beforeEach(async () => {
      preRemoveMiddleware = sinon.spy();
      postRemoveMiddleware = sinon.spy();
      const widgetSchema = new Schema({
        height: {
          type: Schema.Types.Integer()
        }
      });

      widgetSchema.pre('remove', preRemoveMiddleware);
      widgetSchema.post('remove', postRemoveMiddleware);

      Widget = mongres.model('Widget', widgetSchema);

      await mongres.connect(helpers.connectionInfo);

      widgetA = new Widget({
        height: 5
      });
      widgetB = new Widget({
        height: 7
      });
      await Promise.all([widgetA.save(), widgetB.save()]);
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
    let Square;
    let Widget;
    let preSaveMiddleware;
    let postSaveMiddleware;

    beforeEach(async () => {
      preSaveMiddleware = sinon.spy();
      postSaveMiddleware = sinon.spy();

      Square = mongres.model(
        'Square',
        new Schema({
          height: {
            enum: [5, 10],
            type: Schema.Types.Integer()
          },
          width: {
            validate: {
              message: 'invalid width: {VALUE}',
              validator: value => value > 0
            },
            required: true,
            type: Schema.Types.Integer()
          }
        })
      );

      const widgetSchema = new Schema({
        height: {
          type: Schema.Types.Integer()
        }
      });

      widgetSchema.pre('save', preSaveMiddleware);
      widgetSchema.post('save', postSaveMiddleware);

      Widget = mongres.model('Widget', widgetSchema);

      await mongres.connect(helpers.connectionInfo);
    });

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

      it('Can unset optional fields', async () => {
        widget.height = null;
        await widget.save();
        const updated = await Widget.findById(widget.id);
        expect(updated.height).not.to.be.ok;
      });
    });
  });

  describe('#toObject()', () => {
    let Square;
    let Point;
    let Line;

    beforeEach(async () => {
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

      Line = mongres.model(
        'Line',
        new Schema({
          start: {
            type: Schema.Types.Integer(),
            ref: 'Point'
          },
          end: {
            type: Schema.Types.Integer(),
            ref: 'Point'
          }
        })
      );

      Square = mongres.model(
        'Square',
        new Schema({
          height: {
            enum: [5, 10],
            type: Schema.Types.Integer()
          },
          width: {
            validate: {
              message: 'invalid width: {VALUE}',
              validator: value => value > 0
            },
            required: true,
            type: Schema.Types.Integer()
          }
        })
      );

      await mongres.connect(helpers.connectionInfo);
    });

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
    let Square;
    let Widget;
    let preValidateMiddleware;
    let postValidateMiddleware;

    beforeEach(async () => {
      preValidateMiddleware = sinon.spy();
      postValidateMiddleware = sinon.spy();

      Square = mongres.model(
        'Square',
        new Schema({
          height: {
            enum: [5, 10],
            type: Schema.Types.Integer()
          },
          width: {
            validate: {
              message: 'invalid width: {VALUE}',
              validator: value => value > 0
            },
            required: true,
            type: Schema.Types.Integer()
          }
        })
      );

      const widgetSchema = new Schema({
        height: {
          type: Schema.Types.Integer()
        }
      });

      widgetSchema.pre('validate', preValidateMiddleware);
      widgetSchema.post('validate', postValidateMiddleware);

      Widget = mongres.model('Widget', widgetSchema);

      await mongres.connect(helpers.connectionInfo);
    });

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

      return square
        .validate()
        .then(() => {
          return Promise.reject(new Error('Validation should have rejected'));
        })
        .catch(err => {
          expect(err).to.be.instanceof(error.ValidationError);
          expect(err.details[0].message).to.equal('invalid width: -1');
        });
    });

    it('Enforces enums', () => {
      const square = new Square({
        height: 11
      });
      expect(square.validate()).to.be.rejectedWith(error.ValidationError);
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
