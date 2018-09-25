const helpers = require('../helpers');
const { Mongres, Schema, error } = require('../../src');

describe('constraints', () => {
  let mongres;

  beforeEach(async () => {
    await helpers.table.dropTables();
    mongres = new Mongres();
  });

  afterEach(async () => {
    await mongres.disconnect();
  });

  it('Automatically creates an id field as primary key', async () => {
    const schema = new Schema({
      testField: {
        type: Schema.Types.Integer(),
        index: true
      }
    });
    const Model = mongres.model('Test', schema);
    await mongres.connect(helpers.connectionInfo);

    const indexes = await helpers.table.getIndexes(Model.tableName);
    const constraints = await helpers.table.describeConstraints(
      Model.tableName
    );
    const index = indexes.find(row => row.column_name === 'id');
    const constraint = constraints.find(row => {
      return row.constraint_name === index.index_name;
    });

    expect(index).to.be.ok;
    expect(index.index_name).to.equal(`${Model.tableName}_pkey`);

    expect(constraint).to.be.ok;
    expect(constraint.constraint_type).to.equal('PRIMARY KEY');
  });

  it('Adds a foreign key for refs', async () => {
    const otherSchema = new Schema({
      value: {
        type: Schema.Types.Integer()
      }
    });
    const schema = new Schema({
      testField: {
        type: Schema.Types.Integer(),
        ref: 'Other'
      }
    });
    mongres.model('Other', otherSchema);
    const Model = mongres.model('Test', schema);
    await mongres.connect(helpers.connectionInfo);
    const rows = await helpers.table.describeConstraints(Model.tableName);

    const foreignKey = rows.find(row => row.constraint_type === 'FOREIGN KEY');
    expect(foreignKey).to.be.ok;
    expect(foreignKey.constraint_name).to.equal('test_testfield_foreign');
  });

  describe('unique constraints', () => {
    let Model;

    beforeEach(async () => {
      const schema = new Schema({
        testField: {
          type: Schema.Types.Integer(),
          unique: true
        }
      });
      Model = mongres.model('Test', schema);
      await mongres.connect(helpers.connectionInfo);
    });

    it('Creates unique constraints', async () => {
      const rows = await helpers.table.describeConstraints(Model.tableName);

      const constraint = rows.find(row => row.constraint_type === 'UNIQUE');
      expect(constraint).to.be.ok;
      expect(constraint.constraint_name).to.equal('test_testfield_unique');
    });

    it('Throws ConflictError when violated', async () => {
      const existing = await Model.create({
        testField: 1
      });
      const duplicate = new Model({
        testField: existing.testField
      });

      await expect(
        Model.create({
          testField: existing.testField
        })
      ).to.be.rejectedWith(error.ConflictError);

      await expect(duplicate.save()).to.be.rejectedWith(error.ConflictError);
    });
  });

  it('Supports indexes', async () => {
    const schema = new Schema({
      testField: {
        type: Schema.Types.Integer(),
        index: true
      }
    });
    const Model = mongres.model('Test', schema);
    await mongres.connect(helpers.connectionInfo);
    const rows = await helpers.table.getIndexes(Model.tableName);
    const index = rows.find(row => row.column_name === 'testField');
    expect(index).to.be.ok;
    expect(index.index_type).to.equal('btree');
  });

  it('Supports custom index types', async () => {
    const schema = new Schema({
      testField: {
        type: Schema.Types.Integer(),
        index: 'hash'
      }
    });
    const Model = mongres.model('Test', schema);
    await mongres.connect(helpers.connectionInfo);
    const rows = await helpers.table.getIndexes(Model.tableName);
    const index = rows.find(row => row.column_name === 'testField');
    expect(index).to.be.ok;
    expect(index.index_type).to.equal('hash');
  });

  it('Foreign key creation is idempotent', async () => {
    const otherSchema = new Schema({
      value: {
        type: Schema.Types.Integer()
      }
    });
    const schema = new Schema({
      testField: {
        type: Schema.Types.Integer(),
        ref: 'Other'
      }
    });
    mongres.model('Other', otherSchema);
    mongres.model('Test', schema);
    await mongres.connect(helpers.connectionInfo);
    await mongres.disconnect();
    await mongres.connect(helpers.connectionInfo);
  });

  it('Index creation is idempotent', async () => {
    const schema = new Schema({
      testField: {
        type: Schema.Types.Integer(),
        index: true
      }
    });
    mongres.model('Test', schema);
    await mongres.connect(helpers.connectionInfo);
    await mongres.disconnect();
    await mongres.connect(helpers.connectionInfo);
  });

  it('Unique constraint creation is idempotent', async () => {
    const schema = new Schema({
      testField: {
        type: Schema.Types.Integer(),
        unique: true
      }
    });
    mongres.model('Test', schema);
    await mongres.connect(helpers.connectionInfo);
    await mongres.disconnect();
    await mongres.connect(helpers.connectionInfo);
  });
});
