const helpers = require('../helpers');
const { Mongres, Schema } = require('../../src');

describe('Query', () => {
  let mongres;
  let Plot;
  let Value;
  let plotB;

  beforeEach(async () => {
    await helpers.table.dropTables();

    mongres = new Mongres();

    Plot = mongres.model(
      'Plot',
      new Schema({
        a: {
          type: Schema.Types.Integer()
        },
        b: {
          type: Schema.Types.Integer(),
          ref: 'Value'
        },
        c: {
          type: Schema.Types.Integer()
        }
      })
    );

    Value = mongres.model(
      'Value',
      new Schema({
        a: {
          type: Schema.Types.Integer()
        }
      })
    );

    await mongres.connect(helpers.connectionInfo);

    const joinedValue = await Value.create({
      a: 3
    });
    await Value.create({
      a: 2
    });
    await Value.create({
      a: 1
    });

    await Plot.create({
      a: 1,
      b: joinedValue.id,
      c: 1,
      d: 1
    });
    plotB = await Plot.create({
      a: 2,
      b: 2,
      c: 1,
      d: 1
    });
    await Plot.create({
      a: 3,
      b: 1
    });
  });

  afterEach(() => {
    return mongres.disconnect();
  });

  describe('#limit()', () => {
    it('Supports limiting result size', async () => {
      const records = await Plot.find().limit(2);
      expect(records.length).to.equal(2);
    });
  });

  describe('#populate()', () => {
    it('Includes populated fields in the result', async () => {
      const record = await Plot.findOne({
        a: 1
      }).populate('b');
      expect(record.b).to.be.instanceof(Value);
      expect(record.a).to.equal(1);
      expect(record.b.a).to.equal(3);
    });
  });

  describe('#sort()', () => {
    describe('One parameter syntax', () => {
      it('Supports sorting results', async () => {
        const records = await Plot.find().sort('a');
        expect(records.length).to.equal(3);
        expect(records[0].a).to.equal(1);
        expect(records[1].a).to.equal(2);
        expect(records[2].a).to.equal(3);
      });

      it('Supports sorting results in reverse', async () => {
        const records = await Plot.find().sort('-a');
        expect(records.length).to.equal(3);
        expect(records[0].a).to.equal(3);
        expect(records[1].a).to.equal(2);
        expect(records[2].a).to.equal(1);
      });
    });

    describe('Field-Direction string syntax', () => {
      it('Supports sorting results', async () => {
        const records = await Plot.find().sort('a', 'asc');
        expect(records.length).to.equal(3);
        expect(records[0].a).to.equal(1);
        expect(records[1].a).to.equal(2);
        expect(records[2].a).to.equal(3);
      });

      it('Supports sorting results in reverse', async () => {
        const records = await Plot.find().sort('a', 'desc');
        expect(records.length).to.equal(3);
        expect(records[0].a).to.equal(3);
        expect(records[1].a).to.equal(2);
        expect(records[2].a).to.equal(1);
      });
    });

    describe('Field-Direction number syntax', () => {
      it('Supports sorting results', async () => {
        const records = await Plot.find().sort('a', 1);
        expect(records.length).to.equal(3);
        expect(records[0].a).to.equal(1);
        expect(records[1].a).to.equal(2);
        expect(records[2].a).to.equal(3);
      });

      it('Supports sorting results in reverse', async () => {
        const records = await Plot.find().sort('a', -1);
        expect(records.length).to.equal(3);
        expect(records[0].a).to.equal(3);
        expect(records[1].a).to.equal(2);
        expect(records[2].a).to.equal(1);
      });
    });
  });

  describe('#skip()', () => {
    it('Supports skipping a given number of results', async () => {
      const records = await Plot.find()
        .sort('a', 1)
        .skip(1);
      expect(records.length).to.equal(2);
      expect(records[0].a).to.equal(2);
      expect(records[1].a).to.equal(3);
    });
  });

  describe('#where()', () => {
    it('Supports object filters', async () => {
      const records = await Plot.find().where({
        a: 2
      });
      expect(records.length).to.equal(1);
      expect(records[0].toObject()).to.deep.equal(plotB.toObject());
    });

    it('Supports function filters', async () => {
      const records = await Plot.find().where(function() {
        this.where('id', 2);
      });
      expect(records.length).to.equal(1);
      expect(records[0].toObject()).to.deep.equal(plotB.toObject());
    });

    it('Supports raw queries', async () => {
      const records = await Plot.find().where(function(builder, knex) {
        builder.where(knex.raw('a > ?', [1]));
      });
      expect(records.length).to.equal(2);
    });

    it('Supports $eq', async () => {
      const records = await Plot.find().where({
        id: {
          $eq: 2
        }
      });
      expect(records.length).to.equal(1);
      expect(records[0].toObject()).to.deep.equal(plotB.toObject());
    });

    it('Supports $exists', async () => {
      const records = await Plot.find().where({
        c: {
          $exists: true
        }
      });
      expect(records.length).to.equal(2);
    });

    it('Supports $gt', async () => {
      const records = await Plot.find().where({
        a: {
          $gt: 1
        }
      });
      expect(records.length).to.equal(2);
    });

    it('Supports $gte', async () => {
      const records = await Plot.find().where({
        a: {
          $gte: 2
        }
      });
      expect(records.length).to.equal(2);
    });

    it('Supports $in', async () => {
      const records = await Plot.find().where({
        a: {
          $in: [1, 2]
        }
      });
      expect(records.length).to.equal(2);
    });

    it('Supports $lt', async () => {
      const records = await Plot.find().where({
        a: {
          $lt: 3
        }
      });
      expect(records.length).to.equal(2);
    });

    it('Supports $lte', async () => {
      const records = await Plot.find().where({
        a: {
          $lte: 2
        }
      });
      expect(records.length).to.equal(2);
    });

    it('Supports $ne', async () => {
      const records = await Plot.find().where({
        b: {
          $ne: 1
        }
      });
      expect(records.length).to.equal(1);
      expect(records[0].toObject()).to.deep.equal(plotB.toObject());
    });

    it('Supports $nin', async () => {
      const records = await Plot.find().where({
        a: {
          $nin: [1, 3]
        }
      });
      expect(records.length).to.equal(1);
      expect(records[0].toObject()).to.deep.equal(plotB.toObject());
    });

    it('Supports multiple basic conditions', async () => {
      const records = await Plot.find().where({
        c: 1,
        d: 1
      });
      expect(records.length).to.equal(2);
    });

    it('Supports multiple $ conditions', async () => {
      const records = await Plot.find().where({
        a: {
          $lt: 3,
          $gt: 1
        }
      });
      expect(records.length).to.equal(1);
      expect(records[0].toObject()).to.deep.equal(plotB.toObject());
    });
  });
});
