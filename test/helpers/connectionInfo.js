module.exports = {
  client: 'pg',
  connection: {
    user: 'mongres',
    host: 'localhost',
    database: 'mongres_test',
    password: 'mongrespw',
    port: process.env.PGPORT || 5432
  }
};
