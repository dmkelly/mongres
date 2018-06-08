const helpers = require('../helpers');
const { Mongres, Schema } = require('../../src');

describe('Schema', () => {
  describe('#cast()', () => {
    let schema;

    beforeEach(() => {
      schema = new Schema({
        testField: {
          type: Schema.Types.Integer()
        }
      });
    });

    it('Accepts valid data', () => {
      const cleaned = schema.cast({
        testField: 5
      });
      expect(cleaned).to.deep.equal({
        testField: 5
      });
    });

    it('Prunes extraneous fields', () => {
      const cleaned = schema.cast({
        testField: 5,
        badField: 5
      });
      expect(cleaned).to.deep.equal({
        testField: 5
      });
    });

    it('Skips missing fields', () => {
      const cleaned = schema.cast({});
      expect(cleaned).to.deep.equal({});
    });

    it('Gracefully handles no data', () => {
      const cleaned = schema.cast();
      expect(cleaned).to.deep.equal({});
    });
  });

  describe('#index()', () => {
    let mongres;
    let pointSchema;

    beforeEach(async () => {
      await helpers.table.dropTables();

      mongres = new Mongres();

      pointSchema = new Schema({
        x: {
          type: Schema.Types.Integer()
        },
        y: {
          type: Schema.Types.Integer()
        }
      });
    });

    afterEach(() => {
      return mongres.disconnect();
    });

    it('Can apply multi-field indexes', async () => {
      pointSchema.index(['x', 'y']);
      const Point = mongres.model('Point', pointSchema);
      await mongres.connect(helpers.connectionInfo);
      const indexes = await helpers.table.getIndexes(Point.tableName);
      const indexName = `${Point.tableName}_x_y_index`;
      const multiIndexes = indexes.filter(i => i.index_name === indexName);
      const xIndex = multiIndexes.find(i => i.column_name === 'x');
      const yIndex = multiIndexes.find(i => i.column_name === 'y');

      expect(multiIndexes.length).to.equal(2);
      expect(xIndex).to.be.ok;
      expect(yIndex).to.be.ok;
    });

    it('Can apply multi-field unique indexes', async () => {
      pointSchema.index(['x', 'y'], {
        unique: true
      });
      const Point = mongres.model('Point', pointSchema);
      await mongres.connect(helpers.connectionInfo);
      const constraints = await helpers.table.describeConstraints(
        Point.tableName
      );
      const constraintName = `${Point.tableName}_x_y_unique`;
      const unique = constraints.find(
        c => c.constraint_name === constraintName
      );

      expect(unique).to.be.ok;
      expect(unique.table_name).to.equal(Point.tableName);
      expect(unique.constraint_type).to.equal('UNIQUE');
    });
  });
});
