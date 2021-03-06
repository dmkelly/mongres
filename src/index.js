const knex = require('knex');
const pkg = require('../package.json');
const errors = require('./error');
const Model = require('./model');
const Schema = require('./schema');
const { createTables } = require('./lib/tables');
const { modelFactory } = require('./factory');

function createModel(instance, name, schema) {
  if (instance.models.get(name)) {
    throw new Error(`Model "${name}" already exists`);
  }
  const Model = modelFactory(instance, name, schema);
  return Model;
}

class Mongres {
  constructor() {
    this.version = pkg.version;
    this.client = null;
    this.Schema = Schema;
    this.models = new Map();
    this.namespace = 'public';
    this.isConnected = false;
  }

  get dbSchema() {
    return this.namespace
      ? this.client.schema.withSchema(this.namespace)
      : this.client.schema;
  }

  async connect(connectionInfo) {
    this.client = knex(connectionInfo);
    await createTables(this);
    this.isConnected = true;
  }

  async disconnect() {
    if (this.client) {
      await this.client.destroy();
    }
    this.isConnected = false;
  }

  model(name, schema) {
    if (schema) {
      return createModel(this, name, schema);
    }

    const Model = this.models.get(name);
    if (!Model) {
      throw new Error(`Model "${name}" does not exist`);
    }
    return Model;
  }
}

const instance = new Mongres();
instance.error = errors;
instance.Model = Model;
instance.Mongres = Mongres;
instance.Schema = Schema;

module.exports = instance;
