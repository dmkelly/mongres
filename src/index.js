const knex = require('knex');

class Mongres {
  constructor () {
    this.client = null;
  }

  connect (connectionInfo) {
    this.client = knex(connectionInfo);
    return Promise.resolve();
  }

  disconnect () {
    return this.client.destroy();
  }
}

const instance = new Mongres();
instance.Mongres = Mongres;

module.exports = instance;
