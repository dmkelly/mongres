const helpers = require('../helpers');
const { Mongres, Schema } = require('../../src');

describe('I/O', () => {
  let mongres;
  let Widget;

  beforeEach(async () => {
    await helpers.table.dropTables();

    mongres = new Mongres();
    Widget = mongres.model('Widget', new Schema({
      height: {
        type: Schema.Types.Integer()
      }
    }));

    await mongres.connect(helpers.connectionInfo);
  });

  afterEach(() => {
    return mongres.disconnect();
  });

  it('Inserts new records', async () => {
    const widget = new Widget({
      height: 5
    });
    const resource = await widget.save();
    expect(resource.id).to.equal(1);
    const row = await helpers.query.findOne(Widget.tableName, {
      id: resource.id
    });
    expect(row.height).to.equal(5);
    expect(row.id).to.equal(1);
  });

  describe('When the record already exists', () => {
    let widget;

    beforeEach(async () => {
      widget = new Widget({
        height: 5
      });
      widget = await widget.save();
    });

    it('Updates the existing record', async () => {
      widget.height = 8;
      await widget.save();
      const row = await helpers.query.findOne(Widget.tableName, {
        id: widget.id
      });
      expect(row.id).to.equal(1);
      expect(row.height).to.equal(8);
      const count = await helpers.query.count(Widget.tableName);
      expect(count).to.equal(1);
    });
  });
});
