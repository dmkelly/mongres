const helpers = require('../helpers');
const { Mongres, Schema } = require('../../src');

describe('Nested Schemas', () => {
  let mongres;
  let Point;
  let Line;
  let Shape;

  beforeEach(async () => {
    await helpers.table.dropTables();

    mongres = new Mongres();

    const pointSchema = new Schema({
      line: {
        type: Schema.Types.Integer(),
        ref: 'Line'
      },
      x: {
        type: Schema.Types.Integer()
      },
      y: {
        type: Schema.Types.Integer()
      }
    });
    Point = mongres.model('Point', pointSchema);

    const lineSchema = new Schema({
      shape: {
        type: Schema.Types.Integer(),
        ref: 'Shape'
      },
      points: {
        type: [Point]
      }
    });
    Line = mongres.model('Line', lineSchema);

    const shapeSchema = new Schema({
      lines: {
        type: [Line]
      }
    });
    Shape = mongres.model('Shape', shapeSchema);

    await mongres.connect(helpers.connectionInfo);
  });

  afterEach(() => {
    return mongres.disconnect();
  });

  describe('Model#constructor()', () => {
    it('Nested schemas are cast to new instances', () => {
      const line = new Line({
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
      expect(line).to.be.instanceof(Line);
      expect(line.points[0].x).to.equal(1);
      expect(line.points[0]).to.be.instanceof(Point);
      expect(line.points[1]).to.be.instanceof(Point);
    });
  });

  describe('Model#save()', () => {
    it('Saves any new subdocuments', async () => {
      const line = new Line({
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
      await line.save();
      const savedLine = await helpers.query.findOne(Line.tableName, {
        id: line.id
      });
      const savedPoints = await helpers.query.find(Point.tableName);

      expect(savedPoints.length).to.equal(2);
      expect(savedPoints[0].line).to.equal(savedLine.id);
      expect(savedPoints[1].line).to.equal(savedLine.id);
    });

    it('Saves new deeply nested subdocuments', async () => {
      const shape = new Shape({
        lines: [
          {
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
          },
          {
            points: [
              {
                x: 5,
                y: 6
              },
              {
                x: 7,
                y: 8
              }
            ]
          }
        ]
      });
      await shape.save();

      const savedLines = await helpers.query.find(Line.tableName);
      const savedPoints = await helpers.query.find(Point.tableName);

      expect(savedLines.length).to.equal(2);
      expect(savedLines[0].shape).to.equal(shape.id);
      expect(savedLines[1].shape).to.equal(shape.id);
      expect(savedPoints.length).to.equal(4);
    });
  });

  describe('Model#findOne()', () => {
    it('Populates subdocuments on retrieval', async () => {
      const existingLine = new Line({
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
      await existingLine.save();
      const line = await Line.findOne({
        id: existingLine.id
      });

      expect(line).to.be.ok;
      expect(line.points.length).to.equal(2);
      expect(line.points[0]).to.be.instanceof(Point);
      expect(line.points[1]).to.be.instanceof(Point);
    });

    it('Populates deeply nested subdocuments on retrieval', async () => {
      const existingShape = new Shape({
        lines: [
          {
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
          },
          {
            points: [
              {
                x: 5,
                y: 6
              },
              {
                x: 7,
                y: 8
              }
            ]
          }
        ]
      });
      await existingShape.save();
      const shape = await Shape.findOne({
        id: existingShape.id
      });

      expect(shape).to.be.ok;
      expect(shape).to.be.instanceof(Shape);
      expect(shape.lines.length).to.equal(2);
      expect(shape.lines[0]).to.be.instanceof(Line);
      expect(shape.lines[1]).to.be.instanceof(Line);
      expect(shape.lines[0].points.length).to.equal(2);
      expect(shape.lines[0].points[0]).to.be.instanceof(Point);
      expect(shape.lines[0].points[1]).to.be.instanceof(Point);
      expect(shape.lines[1].points[0]).to.be.instanceof(Point);
      expect(shape.lines[1].points[1]).to.be.instanceof(Point);
    });
  });

  describe('Model#find()', () => {
    let existingLine1;
    let existingLine2;

    beforeEach(async () => {
      existingLine1 = new Line({
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
      existingLine2 = new Line({
        points: [
          {
            x: 5,
            y: 6
          },
          {
            x: 7,
            y: 8
          },
          {
            x: 9,
            y: 10
          }
        ]
      });
      await existingLine1.save();
      await existingLine2.save();
    });

    it('Populates subdocuments on retrieval', async () => {
      const lines = await Line.find();
      const line1 = lines.find(line => line.id === existingLine1.id);
      const line2 = lines.find(line => line.id === existingLine2.id);

      expect(lines.length).to.equal(2);
      expect(line1.points.length).to.equal(2);
      expect(line2.points.length).to.equal(3);
    });
  });

  describe('Model#remove()', () => {
    it('Removes nested subdocuments', async () => {
      const line = new Line({
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
      await line.save();
      await line.remove();
      const savedPoints = await helpers.query.find(Point.tableName);

      expect(savedPoints.length).to.equal(0);
    });

    it('Removes deeply nested subdocuments', async () => {
      const shape = new Shape({
        lines: [
          {
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
          },
          {
            points: [
              {
                x: 5,
                y: 6
              },
              {
                x: 7,
                y: 8
              }
            ]
          }
        ]
      });
      await shape.save();
      await shape.remove();

      const savedLines = await helpers.query.find(Line.tableName);
      const savedPoints = await helpers.query.find(Point.tableName);

      expect(savedLines.length).to.equal(0);
      expect(savedPoints.length).to.equal(0);
    });
  });
});
