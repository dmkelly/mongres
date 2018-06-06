const { Model, Mongres, Schema } = require('../../../../src');

describe('model/discriminator/core', () => {
  let mongres;
  let Shape;
  let Rectangle;

  beforeEach(() => {
    mongres = new Mongres();

    const shapeSchema = new Schema({
      area: {
        type: Schema.Types.Integer()
      }
    });

    shapeSchema.statics.add1 = function(number) {
      return number + 1;
    };

    shapeSchema.methods.doubleArea = function() {
      return this.area * 2;
    };

    const rectangleSchema = new Schema({
      height: {
        type: Schema.Types.Integer()
      },
      width: {
        required: true,
        type: Schema.Types.Integer()
      }
    });

    rectangleSchema.statics.add2 = function(number) {
      return number + 2;
    };

    rectangleSchema.methods.doubleHeight = function() {
      return this.height * 2;
    };

    const circleSchema = new Schema({
      diameter: {
        required: true,
        type: Schema.Types.Integer()
      }
    });

    circleSchema.statics.add3 = function(number) {
      return number + 3;
    };

    circleSchema.methods.doubleDiameter = function() {
      return this.diameter * 2;
    };

    Shape = mongres.model('Shape', shapeSchema);

    Rectangle = Shape.discriminator('Rectangle', rectangleSchema);

    Shape.discriminator('Circle', circleSchema);
  });

  describe('#constructor()', () => {
    it('Creates new child of the model', () => {
      const rectangle = new Rectangle({
        height: 3,
        width: 4,
        area: 12
      });
      expect(rectangle).to.be.instanceOf(Rectangle);
      expect(rectangle).to.be.instanceOf(Shape);
      expect(rectangle).to.be.instanceOf(Model);
    });

    it('Provides access to data on its parent and child schemas', () => {
      const rectangle = new Rectangle({
        height: 3,
        width: 4,
        area: 12
      });
      expect(rectangle.toObject()).to.deep.equal({
        height: 3,
        width: 4,
        area: 12,
        type: 'Rectangle'
      });
    });
  });

  describe('getters', () => {
    it('Provides top-level properties to access the data', () => {
      const rectangle = new Rectangle({
        height: 3,
        width: 4,
        area: 12
      });
      expect(rectangle.height).to.equal(3);
      expect(rectangle.width).to.equal(4);
      expect(rectangle.area).to.equal(12);
    });
  });

  describe('setters', () => {
    it('Provides top-level properties to modify the data', () => {
      const rectangle = new Rectangle({
        height: 3,
        width: 4,
        area: 12
      });
      rectangle.height = 10;
      rectangle.area = 40;
      expect(rectangle.height).to.equal(10);
      expect(rectangle.area).to.equal(40);
    });

    it('Only applies the value if it matches the type', () => {
      const rectangle = new Rectangle({
        height: 3,
        width: 4,
        area: 12
      });
      rectangle.height = 'bad';
      rectangle.area = 'bad';
      expect(rectangle.height).to.equal(3);
      expect(rectangle.area).to.equal(12);
    });
  });

  describe('methods', () => {
    it('Supports attaching instance methods via the schema', () => {
      const rectangle = new Rectangle({
        height: 3,
        width: 4,
        area: 12
      });
      expect(rectangle.doubleHeight()).to.equal(6);
    });

    it('Inherits instance methods from parent schema', () => {
      const rectangle = new Rectangle({
        height: 3,
        width: 4,
        area: 12
      });
      expect(rectangle.doubleArea()).to.equal(24);
    });

    it('Does not attach methods of sibling schemas', () => {
      const rectangle = new Rectangle({
        height: 3,
        width: 4,
        area: 12
      });
      expect(rectangle.doubleDiameter).to.be.undefined;
    });
  });

  describe('statics', () => {
    it('Supports attaching statics to the schema', () => {
      expect(Rectangle.add2(1)).to.equal(3);
    });

    it('Supports attaching statics from the parent schema', () => {
      expect(Rectangle.add1(1)).to.equal(2);
    });

    it('Does not attach statics from sibling schemas', () => {
      expect(Rectangle.add3).to.be.undefined;
    });
  });
});
