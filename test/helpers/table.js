const knex = require('knex');
const connectionInfo = require('./connectionInfo');
const describeLib = require('../../src/lib/describe');

async function dropTables() {
  const client = knex(connectionInfo);
  const tableQuery =
    'SELECT tablename FROM pg_catalog.pg_tables' + " WHERE schemaname='public'";
  const tableRows = await client.raw(tableQuery);

  const tables = tableRows.rows.map(row => row.tablename);
  const dropQuery = `DROP TABLE IF EXISTS ${tables.join(',')} CASCADE`;
  await client.raw(dropQuery);
  await client.destroy();
}

async function describeConstraints(tableName) {
  const client = knex(connectionInfo);
  const constraints = await describeLib.getConstraints({ client }, tableName);
  await client.destroy();
  return constraints;
}

async function getIndexes(tableName) {
  const client = knex(connectionInfo);
  const indexes = await describeLib.getIndexes({ client }, tableName);
  await client.destroy();
  return indexes;
}

module.exports = {
  dropTables,
  describeConstraints,
  getIndexes
};
