const helpers = require('../../helpers');
const {
  Mongres,
  Schema: { Types }
} = require('../../../src');

describe('docs/Relations', () => {
  let mongres;

  beforeEach(async () => {
    await helpers.table.dropTables();

    mongres = new Mongres();
  });

  afterEach(async () => {
    await mongres.disconnect();
  });

  describe('One-to-Many', () => {
    let Customer;
    let Order;

    beforeEach(async () => {
      Order = mongres.model(
        'Order',
        new mongres.Schema({
          customer: {
            type: Types.Integer(),
            ref: 'Customer'
          },
          time: {
            type: Types.Date()
          }
        })
      );

      Customer = mongres.model(
        'Customer',
        new mongres.Schema({
          name: {
            type: Types.String()
          }
        })
      );

      await mongres.connect(helpers.connectionInfo);

      const customer = await Customer.create({
        name: 'Dave'
      });
      await Order.create({
        customer: customer.id,
        time: new Date()
      });
    });

    it('Attaches related documents on find', async () => {
      const orders = await Order.find().populate('customer');
      expect(orders[0].customer.name).to.equal('Dave');
    });
  });

  describe('Many-to-Many', () => {
    let Student;
    let Course;

    beforeEach(async () => {
      Student = mongres.model(
        'Student',
        new mongres.Schema({
          name: {
            type: Types.String()
          },
          courses: {
            type: ['Course'],
            ref: 'Course'
          }
        })
      );

      Course = mongres.model(
        'Course',
        new mongres.Schema({
          title: {
            type: Types.String()
          },
          startTime: {
            type: Types.Date()
          },
          students: {
            type: ['Student'],
            ref: 'Student'
          }
        })
      );

      await mongres.connect(helpers.connectionInfo);
    });

    it('Attaches related documents', async () => {
      const student = await Student.create({
        name: 'Dave'
      });
      const course = await Course.create({
        title: 'Math',
        startTime: new Date()
      });

      await course.associate('students', student);

      const courses = await Course.find().populate('students');
      expect(courses[0].students.length).to.equal(1);
      expect(courses[0].students[0].id).to.equal(student.id);
    });
  });
});
