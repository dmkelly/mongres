const helpers = require('../../helpers');
const { Mongres, Schema } = require('../../../src');

describe('types', () => {
  let mongres;
  let Model;

  beforeEach(async () => {
    await helpers.table.dropTables();

    mongres = new Mongres();

    Model = mongres.model(
      'Data',
      new Schema({
        boolean: {
          type: Schema.Types.Boolean()
        },
        date: {
          type: Schema.Types.Date()
        },
        float: {
          type: Schema.Types.Float()
        },
        integer: {
          type: Schema.Types.Integer()
        },
        jsonArray: {
          type: Schema.Types.JsonArray()
        },
        string: {
          type: Schema.Types.String()
        },
        text: {
          type: Schema.Types.Text()
        }
      })
    );

    await mongres.connect(helpers.connectionInfo);
  });

  afterEach(() => {
    return mongres.disconnect();
  });

  it('Can serialize and deserialize to database', async () => {
    const data = {
      boolean: true,
      date: new Date(),
      float: 5.5,
      integer: 3,
      jsonArray: [1, 'a'],
      string: 'test',
      text: 'asdf'.repeat(256)
    };
    const document = await Model.create(data);
    const saved = await Model.findById(document.id);
    const savedData = saved.toObject();
    delete savedData.id;

    expect(savedData).to.deep.equal(data);
  });
});
