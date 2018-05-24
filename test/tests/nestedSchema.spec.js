const helpers = require('../helpers');
const { Mongres, Schema } = require('../../src');

describe('Nested Schemas', () => {
  let mongres;
  let Point;
  let Line;

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
      points: {
        type: [Point]
      }
    });
    Line = mongres.model('Line', lineSchema);

    await mongres.connect(helpers.connectionInfo);
  });

  afterEach(() => {
    return mongres.disconnect();
  });

  describe('Model#constructor()', () => {
    it('Nested schemas are cast to new instances', () => {
      const line = new Line({
        points: [{
          x: 1,
          y: 2
        }, {
          x: 3,
          y: 4
        }]
      });
      expect(line).to.be.instanceof(Line);
      expect(line.points[0].x).to.equal(1);
      expect(line.points[0]).to.be.instanceof(Point);
      expect(line.points[1]).to.be.instanceof(Point);
    });
  });

  describe('Model#save()', () => {
    let line;

    beforeEach(async () => {
      line = new Line({
        points: [{
          x: 1,
          y: 2
        }, {
          x: 3,
          y: 4
        }]
      });
      await line.save();
    });

    it('Saves any new subdocuments', async () => {
      const savedLine = await helpers.query.findOne(Line.tableName, {
        id: line.id
      });
      const savedPoints = await helpers.query.find(Point.tableName);
      expect(savedPoints.length).to.equal(2);
      expect(savedPoints[0].line).to.equal(savedLine.id);
      expect(savedPoints[1].line).to.equal(savedLine.id);
    });
  });
});
