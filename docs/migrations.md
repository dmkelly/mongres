# Migrations

Most migrations should be handled using [knex migrations](https://knexjs.org/#Migrations). Fields offer basic support to ensure their definition is properly represented by the migration.

## Adding a field

In the migration js file.

```javascript
const mongres = require('mongres');

exports.up = function(knex) {
  const Person = mongres.model('Person');

  return Person.schema.fields.height.migrateAdd(knex, Person);
};
```

## Removing a field

In the migration js file.

```javascript
const mongres = require('mongres');

exports.down = function(knex) {
  const Person = mongres.model('Person');

  return Person.schema.fields.height.migrateRemove(knex, Person);
};
```
