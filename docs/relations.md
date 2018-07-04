# Relations

Relations are specified on the schema fields. Mongres will determine the type of
relationship required to support the API defined for each model's schema. Any
tables and foreign keys will be created to support each relationship upon
connection.

## One-to-Many

One-to-many relations are defined when a field on a schema specifies a reference
to another model. References can be specified as the string of a model name or
as a model class. The type for reference fields should correspond to the data
type of the `id` field on the referenced model. By default, this is `Integer`.

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

To retrieve related records in a query, use the `.populate()` function,
specifying the name of the field to populate. This will attach the corresponding
document from the related model to each resulting item.

```javascript
const orders = await Order.find().populate('customer');
console.log(orders[0].customer.name);
```

Relations can also be specified on the "one" side to support attaching multiple
documents to the field. Indicate that multiple documents could be attached to
the field by specifying the type as an array containing the model class of the
referenced model or as an array containing the model name as a string.

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

When a field that supports multiple documents is populated, an array of related
documents will by attached to the field.

```javascript
const customers = await Customer.find().populate('orders');
console.log(customers[0].orders[0].time.toISOString());
```

## Cascading Constraints

The default `ON DELETE` behavior for relations is `SET NULL`. Any of the
following conditions will enable cascading delete behavior when the referenced
document is removed:

- The field is required
- The `cascade` property on the field is set to `true`
- The model that contains the reference is a nested model inside the reference model
