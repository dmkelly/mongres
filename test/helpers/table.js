const knex = require('knex');
const defaultConnectionInfo = require('./connectionInfo');

async function dropTables (connectionInfo = defaultConnectionInfo) {
  const client = knex(connectionInfo);
  const tableQuery = 'SELECT tablename FROM pg_catalog.pg_tables' +
    ' WHERE schemaname=\'public\'';
  const tableRows = await client.raw(tableQuery);

  const tables = tableRows.rows.map(row => row.tablename);
  const dropQuery = `DROP TABLE IF EXISTS ${tables.join(',')} CASCADE`;
  await client.raw(dropQuery);
  await client.destroy();
}

module.exports = {
  dropTables
};
