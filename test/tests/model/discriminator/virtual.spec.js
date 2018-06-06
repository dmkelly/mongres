const { Mongres, Schema } = require('../../../../src');

describe('model/discriminator/virtual', () => {
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

    shapeSchema.virtual('doubleArea').get(function() {
      return this.area * 2;
    });

    const rectangleSchema = new Schema({
      height: {
        type: Schema.Types.Integer()
      },
      width: {
        required: true,
        type: Schema.Types.Integer()
      }
    });

    rectangleSchema.virtual('doubleHeight').get(function() {
      return this.height * 2;
    });

    const circleSchema = new Schema({
      diameter: {
        required: true,
        type: Schema.Types.Integer()
      }
    });

    circleSchema.virtual('doubleDiameter').get(function() {
      return this.diameter * 2;
    });

    Shape = mongres.model('Shape', shapeSchema);

    Rectangle = Shape.discriminator('Rectangle', rectangleSchema);

    Shape.discriminator('Circle', circleSchema);
  });

  it('Supports attaching virtuals to children', () => {
    const rectangle = new Rectangle({
      height: 4,
      width: 3,
      area: 12
    });
    expect(rectangle.doubleHeight).to.equal(8);
  });

  it('Inherits virtuals from the parent', () => {
    const rectangle = new Rectangle({
      height: 4,
      width: 3,
      area: 12
    });
    expect(rectangle.doubleArea).to.equal(24);
  });

  it('Does not attach virtuals from siblings', () => {
    const rectangle = new Rectangle({
      height: 4,
      width: 3,
      area: 12
    });
    expect(rectangle.doubleDiameter).to.be.undefined;
  });
});
