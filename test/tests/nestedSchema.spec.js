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
        type: [Point],
        attach: true
      }
    });
    Line = mongres.model('Line', lineSchema);

    const shapeSchema = new Schema({
      lines: {
        type: [Line],
        attach: true
      }
    });
    Shape = mongres.model('Shape', shapeSchema);
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
    beforeEach(async () => {
      await mongres.connect(helpers.connectionInfo);
    });

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
    let PointLight;
    let LineLight;

    beforeEach(async () => {
      const pointLightSchema = new Schema({
        line: {
          type: Schema.Types.Integer(),
          ref: 'LineLight'
        },
        x: {
          type: Schema.Types.Integer()
        },
        y: {
          type: Schema.Types.Integer()
        }
      });
      PointLight = mongres.model('PointLight', pointLightSchema);

      const lineLightSchema = new Schema({
        points: {
          type: [PointLight],
          ref: 'PointLight'
        }
      });
      LineLight = mongres.model('LineLight', lineLightSchema);
    });

    describe('Attached subdocuments', () => {
      beforeEach(async () => {
        await mongres.connect(helpers.connectionInfo);
      });

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

    describe('One to many', () => {
      beforeEach(async () => {
        await mongres.connect(helpers.connectionInfo);
      });

      it('Populates ref lists with #populate()', async () => {
        const existingLine = await LineLight.create({
          name: 'test'
        });
        const point1 = await PointLight.create({
          line: existingLine.id,
          x: 1,
          y: 2
        });
        const point2 = await PointLight.create({
          line: existingLine.id,
          x: 3,
          y: 4
        });

        const [line] = await LineLight.find({
          id: existingLine.id
        }).populate('points');

        expect(line).to.be.ok;
        expect(line.points[0]).to.be.instanceof(PointLight);
        expect(line.points[1]).to.be.instanceof(PointLight);
        expect(line.points.find(point => point.id === point1.id)).to.be.ok;
        expect(line.points.find(point => point.id === point2.id)).to.be.ok;
      });
    });

    describe('Many to many', () => {
      let Widget;
      let Kit;
      let kit1;
      let kit2;
      let widget1;
      let widget2;

      beforeEach(async () => {
        Kit = mongres.model(
          'Kit',
          new Schema({
            size: {
              type: Schema.Types.Integer()
            },
            widgets: {
              type: ['Widget'],
              ref: 'Widget'
            }
          })
        );

        Widget = mongres.model(
          'Widget',
          new Schema({
            weight: {
              type: Schema.Types.Integer()
            },
            kits: {
              type: [Kit],
              ref: 'Kit'
            }
          })
        );

        await mongres.connect(helpers.connectionInfo);

        kit1 = await Kit.create({
          size: 1
        });
        kit2 = await Kit.create({
          size: 2
        });
        await Kit.create({
          size: 3
        });
        widget1 = await Widget.create({
          weight: 1
        });
        widget2 = await Widget.create({
          weight: 2
        });
        await Widget.create({
          weight: 3
        });

        await widget1.associate('kits', kit1);
        await widget2.associate('kits', kit1);
        await widget2.associate('kits', kit2);
      });

      it('Safely handles preexisting associations', async () => {
        await widget1.associate('kits', kit1);
      });

      it('Does not attach refs by default', async () => {
        const kit = await Kit.findById(kit1.id);
        const widget = await Widget.findById(widget2.id);
        expect(kit.widgets).to.deep.equal([]);
        expect(widget.kits).to.deep.equal([]);
      });

      it('Attaches refs with #populate()', async () => {
        const [kit] = await Kit.find({
          id: kit1.id
        }).populate('widgets');
        const [widget] = await Widget.find({
          id: widget2.id
        }).populate('kits');

        expect(kit.widgets).to.be.ok;
        expect(kit.widgets.length).to.equal(2);
        expect(kit.widgets[0]).to.be.instanceof(Widget);
        expect(kit.widgets[1]).to.be.instanceof(Widget);
        expect(widget.kits).to.be.ok;
        expect(widget.kits.length).to.equal(2);
        expect(widget.kits[0]).to.be.instanceof(Kit);
        expect(widget.kits[1]).to.be.instanceof(Kit);
      });

      describe('#dissociate()', () => {
        it('Removes a relationship between documents', async () => {
          await kit1.dissociate('widgets', widget2);

          const [kit] = await Kit.find({
            id: kit1.id
          }).populate('widgets');

          expect(kit.widgets.length).to.equal(1);
          expect(kit.widgets[0].id).not.to.equal(widget2.id);
        });
      });
    });
  });

  describe('Model#find()', () => {
    let existingLine1;
    let existingLine2;

    beforeEach(async () => {
      await mongres.connect(helpers.connectionInfo);

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
    beforeEach(async () => {
      await mongres.connect(helpers.connectionInfo);
    });

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

  describe('Cascading dependencies', () => {
    let Person;
    let Comment;
    let person;
    let comment;

    beforeEach(async () => {
      Person = mongres.model(
        'Person',
        new mongres.Schema({
          name: {
            type: mongres.Schema.Types.String()
          }
        })
      );
      Comment = mongres.model(
        'Comment',
        new mongres.Schema({
          text: {
            type: mongres.Schema.Types.String()
          },
          author: {
            type: mongres.Schema.Types.Integer(),
            ref: 'Person',
            cascade: true
          }
        })
      );

      await mongres.connect(helpers.connectionInfo);

      person = await Person.create({
        name: 'dave'
      });
      comment = await Comment.create({
        text: 'test',
        author: person.id
      });
    });

    it('Deletes cascading dependencies', async () => {
      await person.remove();
      const existingComment = await Comment.findById(comment.id);
      expect(existingComment).not.to.be.ok;
    });
  });
});
