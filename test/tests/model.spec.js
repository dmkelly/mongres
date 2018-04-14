const { Model, Mongres, Schema } = require('../../src');

describe('Model', () => {
  let mongres;

  beforeEach(() => {
    mongres = new Mongres();
  });

  describe('#constructor()', () => {
    let Widget;

    beforeEach(() => {
      Widget = mongres.model('Widget', new Schema({
        height: {
          type: Schema.Types.Integer()
        }
      }));
    });

    it('Creates new model', () => {
      const widget = new Widget({
        height: 5
      });
      expect(widget).to.be.instanceOf(Widget);
      expect(widget).to.be.instanceOf(Model);
    });

    it('Provides access to its data', () => {
      const widget = new Widget({
        height: 5
      });
      expect(widget.toObject()).to.deep.equal({
        height: 5
      });
    });
  });
});
