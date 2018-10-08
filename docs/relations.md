# Relations

Relations are specified on the schema fields. Mongres will determine the type of relationship required to support the API defined for each model's schema. Any tables and foreign keys will be created to support each relationship upon connection.

## One-to-Many

One-to-many relations are defined when a field on a schema specifies a reference to another model. References can be specified as the string of a model name or as a model class. The type for reference fields should correspond to the data type of the `id` field on the referenced model. By default, this is `Integer`.

```javascript
const mongres = require('mongres');
const { Types } = mongres.Schema;

const Customer = mongres.model('Customer', new mongres.Schema({
  name: {
    type: Types.String()
  }
}));

const Order = mongres.model('Order', new mongres.Schema({
  customer: {
    type: Types.Integer(),
    ref: 'Customer'
  },
  time: {
    type: Types.Date()
  }
}));

await mongres.connect();
```

This yields the following tables:

```
                                    Table "public.customer"
 Column |          Type          | Collation | Nullable |               Default
--------+------------------------+-----------+----------+--------------------------------------
 name   | character varying(255) |           |          |
 id     | integer                |           | not null | nextval('customer_id_seq'::regclass)
Indexes:
    "customer_pkey" PRIMARY KEY, btree (id)
Referenced by:
    TABLE ""order"" CONSTRAINT "order_customer_foreign" FOREIGN KEY (customer) REFERENCES customer(id) ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED

                                      Table "public.order"
  Column  |           Type           | Collation | Nullable |              Default
----------+--------------------------+-----------+----------+-----------------------------------
 customer | integer                  |           |          |
 time     | timestamp with time zone |           |          |
 id       | integer                  |           | not null | nextval('order_id_seq'::regclass)
Indexes:
    "order_pkey" PRIMARY KEY, btree (id)
Foreign-key constraints:
    "order_customer_foreign" FOREIGN KEY (customer) REFERENCES customer(id) ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED
```

To retrieve related records in a query, use the `.populate()` function, specifying the name of the field to populate. This will attach the corresponding document from the related model to each resulting item.

```javascript
const orders = await Order.find().populate('customer');
console.log(orders[0].customer.name);
```

Relations can also be specified on the "one" side to support attaching multiple documents to the field. Indicate that multiple documents could be attached to the field by specifying the type as an array containing the model class of the referenced model or as an array containing the model name as a string.

```javascript
const Customer = mongres.model(
  'Customer',
  new mongres.Schema({
    name: {
      type: Types.String()
    },
    orders: {
      type: [Order],
      ref: 'Order'
    }
  })
);
```

When a field that supports multiple documents is populated, an array of related documents will by attached to the field.

```javascript
const customers = await Customer.find().populate('orders');
console.log(customers[0].orders[0].time.toISOString());
```

## Many-to-Many

Many to many relationships are defined when fields in both models of the relationship indicate that it is possible for multiple instances of the other model to attach at that field. When a many to many relationship is defined, a table will be created that manages this relationship.

Field types can be referenced by the model name provided when the schema is passed into the `mongres.model()` function.

```javascript
const Student = mongres.model(
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

const Course = mongres.model(
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
```

This yields the following tables

```
                                      Table "public.course"
  Column   |           Type           | Collation | Nullable |              Default
-----------+--------------------------+-----------+----------+------------------------------------
 title     | character varying(255)   |           |          |
 startTime | timestamp with time zone |           |          |
 id        | integer                  |           | not null | nextval('course_id_seq'::regclass)
Indexes:
    "course_pkey" PRIMARY KEY, btree (id)
Referenced by:
    TABLE "course_student" CONSTRAINT "course_student_course_foreign" FOREIGN KEY (course) REFERENCES course(id) ON UPDATE CASCADE ON DELETE CASCADE

                                    Table "public.student"
 Column |          Type          | Collation | Nullable |               Default
--------+------------------------+-----------+----------+-------------------------------------
 name   | character varying(255) |           |          |
 id     | integer                |           | not null | nextval('student_id_seq'::regclass)
Indexes:
    "student_pkey" PRIMARY KEY, btree (id)
Referenced by:
    TABLE "course_student" CONSTRAINT "course_student_student_foreign" FOREIGN KEY (student) REFERENCES student(id) ON UPDATE CASCADE ON DELETE CASCADE

           Table "public.course_student"
 Column  |  Type   | Collation | Nullable | Default
---------+---------+-----------+----------+---------
 student | integer |           | not null |
 course  | integer |           | not null |
Indexes:
    "course_student_pkey" PRIMARY KEY, btree (course, student)
Foreign-key constraints:
    "course_student_course_foreign" FOREIGN KEY (course) REFERENCES course(id) ON UPDATE CASCADE ON DELETE CASCADE
    "course_student_student_foreign" FOREIGN KEY (student) REFERENCES student(id) ON UPDATE CASCADE ON DELETE CASCADE
```

The many-to-many relationship between documents is created using the `associate` function on one of the documents. The first argument to the associate function is the name of the field on the model to use for the relationship. The second argument is the document.

```javascript
const student = await Student.findById(1);
const course = await Course.findById(3);

await student.associate('courses', course);
```

## Cascading Constraints

The default `ON DELETE` behavior for relations is `SET NULL`. Any of the
following conditions will enable cascading delete behavior when the referenced
document is removed:

- The field is required
- The `cascade` property on the field is set to `true`
- The model that contains the reference is a nested model inside the reference model
