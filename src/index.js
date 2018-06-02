const knex = require('knex');
const errors = require('./error');
const Model = require('./model');
const Schema = require('./schema');
const { createTables } = require('./lib/tables');
const { modelFactory } = require('./factory');

function createModel (instance, name, schema) {
  if (instance.models.get(name)) {
    throw new Error(`Model "${name}" already exists`);
  }
  const Model = modelFactory(instance, name, schema);
  return Model;
}

class Mongres {
  constructor () {
    this.client = null;
    this.Schema = Schema;
    this.models = new Map();
    this.namespace = 'public';
  }

  get dbSchema () {
    return this.namespace
      ? this.client.schema.withSchema(this.namespace)
      : this.client.schema;
  }

  connect (connectionInfo) {
    this.client = knex(connectionInfo);
    return createTables(this);
  }

  disconnect () {
    return this.client.destroy();
  }

  model (name, schema) {
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
