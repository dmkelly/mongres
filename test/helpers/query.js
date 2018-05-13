const knex = require('knex');
const connectionInfo = require('./connectionInfo');

async function count (tableName, filters = {}) {
  const client = knex(connectionInfo);
  const results = await client(tableName).where(filters).count('id');
  await client.destroy();
  return Number(results[0].count);
}

async function find (tableName, filters = {}) {
  const client = knex(connectionInfo);
  const results = await client(tableName).where(filters);
  await client.destroy();
  return results;
}

async function findOne (...args) {
  const results = await find(...args);
  return results[0];
}

module.exports = {
  count,
  find,
  findOne
};
