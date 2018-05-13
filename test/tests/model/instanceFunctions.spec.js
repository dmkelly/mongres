const sinon = require('sinon');
const helpers = require('../../helpers');
const { Mongres, Schema, error } = require('../../../src');

describe('model/instanceFunctions', () => {
  let mongres;
  let Widget;
  let preSaveMiddleware;
  let postSaveMiddleware;

  beforeEach(async () => {
    await helpers.table.dropTables();

    mongres = new Mongres();
    preSaveMiddleware = sinon.spy();
    postSaveMiddleware = sinon.spy();

    const widgetSchema = new Schema({
      height: {
        type: Schema.Types.Integer()
      },
      width: {
        required: true,
        type: Schema.Types.Integer()
      }
    });

    widgetSchema.pre('save', preSaveMiddleware);
    widgetSchema.post('save', postSaveMiddleware);

    Widget = mongres.model('Widget', widgetSchema);

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

  describe('#validate()', () => {
    it('Enforces required fields', () => {
      const widget = new Widget({
        height: 'asdf'
      });
      expect(() => widget.validate()).to.throw(error.ValidationError);
    });
  });
});
