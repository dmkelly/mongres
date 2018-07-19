const { Mongres, Schema } = require('../../../src');

describe('model/field[]', () => {
  let Shape;
  let Point;

  beforeEach(async () => {
    const mongres = new Mongres();
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
    Shape = mongres.model(
      'Shape',
      new Schema({
        name: {
          type: Schema.Types.String()
        },
        points: {
          type: [Point],
          ref: 'Point'
        }
      })
    );
  });

  it('Casts all values in a list to the model', () => {
    const shape = new Shape({
      name: 'line',
      points: [
        {
          x: 1,
          y: 2
        },
        {
          x: 3,
          y: 4
        }
      ]
    });

    expect(shape.points[0]).to.be.instanceof(Point);
    expect(shape.points[1]).to.be.instanceof(Point);
  });

  it('Accepts values in a list that are already a model', () => {
    const shape = new Shape({
      name: 'line',
      points: [
        new Point({
          x: 1,
          y: 2
        }),
        {
          x: 3,
          y: 4
        }
      ]
    });

    expect(shape.points[0]).to.be.instanceof(Point);
    expect(shape.points[1]).to.be.instanceof(Point);
  });

  it('Casts values to model when set by index', () => {
    const shape = new Shape({
      name: 'line',
      points: [
        new Point({
          x: 1,
          y: 2
        })
      ]
    });

    shape.points[1] = {
      x: 2,
      y: 3
    };

    expect(shape.points[0]).to.be.instanceof(Point);
    expect(shape.points[1]).to.be.instanceof(Point);
  });

  describe('#concat()', () => {
    let shape;

    beforeEach(() => {
      shape = new Shape({
        name: 'line',
        points: [
          new Point({
            x: 1,
            y: 2
          })
        ]
      });
    });

    it('Coerces any values onto the list into a model', () => {
      shape.points = shape.points.concat([
        {
          x: 2,
          y: 3
        }
      ]);

      expect(shape.points[0]).to.be.instanceof(Point);
      expect(shape.points[1]).to.be.instanceof(Point);
    });

    it('Handles non-array types', () => {
      shape.points = shape.points.concat({
        x: 2,
        y: 3
      });

      expect(shape.points[0]).to.be.instanceof(Point);
      expect(shape.points[1]).to.be.instanceof(Point);
    });

    it('Handles multiple arguments', () => {
      shape.points = shape.points.concat(
        [
          {
            x: 2,
            y: 3
          },
          {
            x: 4,
            y: 5
          }
        ],
        {
          x: 2,
          y: 3
        }
      );

      expect(shape.points[0]).to.be.instanceof(Point);
      expect(shape.points[1]).to.be.instanceof(Point);
      expect(shape.points[2]).to.be.instanceof(Point);
      expect(shape.points[3]).to.be.instanceof(Point);
    });
  });

  describe('#push()', () => {
    let shape;

    beforeEach(() => {
      shape = new Shape({
        name: 'line',
        points: [
          new Point({
            x: 1,
            y: 2
          })
        ]
      });
    });

    it('Coerces and appends a new model to the end of the list', () => {
      shape.points.push({
        x: 2,
        y: 3
      });

      expect(shape.points[1]).to.be.instanceof(Point);
      expect(shape.points[1].x).to.equal(2);
    });

    it('Handles when the value is already a model', () => {
      shape.points.push(
        new Point({
          x: 2,
          y: 3
        })
      );

      expect(shape.points[1]).to.be.instanceof(Point);
      expect(shape.points[1].x).to.equal(2);
    });

    it('Handles multiple arguments', () => {
      shape.points.push(
        new Point({
          x: 2,
          y: 3
        }),
        {
          x: 3,
          y: 4
        }
      );

      expect(shape.points[1]).to.be.instanceof(Point);
      expect(shape.points[1].x).to.equal(2);
      expect(shape.points[2]).to.be.instanceof(Point);
      expect(shape.points[2].x).to.equal(3);
    });
  });

  describe('#splice()', () => {
    let shape;

    beforeEach(() => {
      shape = new Shape({
        name: 'line',
        points: [
          new Point({
            x: 1,
            y: 2
          })
        ]
      });
    });

    it('Coerces and inserts a new model into the list', () => {
      shape.points.splice(1, 0, {
        x: 2,
        y: 3
      });

      expect(shape.points[1]).to.be.instanceof(Point);
      expect(shape.points[1].x).to.equal(2);
    });

    it('Handles when the value is already a model', () => {
      shape.points.splice(
        1,
        0,
        new Point({
          x: 2,
          y: 3
        })
      );

      expect(shape.points[1]).to.be.instanceof(Point);
      expect(shape.points[1].x).to.equal(2);
    });

    it('Handles multiple arguments', () => {
      shape.points.splice(
        1,
        0,
        new Point({
          x: 2,
          y: 3
        }),
        {
          x: 3,
          y: 4
        }
      );

      expect(shape.points[1]).to.be.instanceof(Point);
      expect(shape.points[1].x).to.equal(2);
      expect(shape.points[2]).to.be.instanceof(Point);
      expect(shape.points[2].x).to.equal(3);
    });

    it('Supports deletes', () => {
      shape.points.splice(0, 1);

      expect(shape.points.length).to.equal(0);
    });

    it('Supports deletes and insertions', () => {
      shape.points.splice(
        0,
        1,
        new Point({
          x: 2,
          y: 3
        })
      );

      expect(shape.points.length).to.equal(1);
      expect(shape.points[0]).to.be.instanceof(Point);
      expect(shape.points[0].x).to.equal(2);
    });
  });

  describe('#unshift()', () => {
    let shape;

    beforeEach(() => {
      shape = new Shape({
        name: 'line',
        points: [
          new Point({
            x: 1,
            y: 2
          })
        ]
      });
    });

    it('Coerces and prepends a new model to the beginning of the list', () => {
      shape.points.unshift({
        x: 2,
        y: 3
      });

      expect(shape.points[0]).to.be.instanceof(Point);
      expect(shape.points[0].x).to.equal(2);
    });

    it('Handles when the value is already a model', () => {
      shape.points.unshift(
        new Point({
          x: 2,
          y: 3
        })
      );

      expect(shape.points[0]).to.be.instanceof(Point);
      expect(shape.points[0].x).to.equal(2);
    });

    it('Handles multiple arguments', () => {
      shape.points.unshift(
        new Point({
          x: 2,
          y: 3
        }),
        {
          x: 3,
          y: 4
        }
      );

      expect(shape.points[0]).to.be.instanceof(Point);
      expect(shape.points[0].x).to.equal(2);
      expect(shape.points[1]).to.be.instanceof(Point);
      expect(shape.points[1].x).to.equal(3);
    });
  });
});
