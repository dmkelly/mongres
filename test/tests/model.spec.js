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

  describe('getters', () => {
    let Widget;

    beforeEach(() => {
      Widget = mongres.model('Widget', new Schema({
        height: {
          type: Schema.Types.Integer()
        }
      }));
    });

    it('Provides top-level properties to access the data', () => {
      const widget = new Widget({
        height: 5
      });
      expect(widget.height).to.equal(5);
    });

    it('Getters are specific to the instance', () => {
      const smallWidget = new Widget({
        height: 1
      });
      const widget = new Widget({
        height: 5
      });
      expect(smallWidget.height).to.equal(1);
      expect(widget.height).to.equal(5);
    });
  });

  describe('setters', () => {
    let Widget;

    beforeEach(() => {
      Widget = mongres.model('Widget', new Schema({
        height: {
          type: Schema.Types.Integer()
        }
      }));
    });

    it('Provides top-level properties to modify the data', () => {
      const widget = new Widget({
        height: 5
      });
      widget.height = 10;
      expect(widget.height).to.equal(10);
    });

    it('Setters are specific to the instance', () => {
      const smallWidget = new Widget({
        height: 1
      });
      const widget = new Widget({
        height: 5
      });
      smallWidget.height = 2;
      widget.height = 10;
      expect(smallWidget.height).to.equal(2);
      expect(widget.height).to.equal(10);
    });

    it('Only applies the value if it matches the type', () => {
      const widget = new Widget({
        height: 5
      });
      widget.height = 'bad';
      expect(widget.height).to.equal(5);
    });
  });
});
