const { normalizeSortArgs } = require('./lib/query');
const { pick } = require('./utils');

class Query {
  constructor (Model, options) {
    this.Model = Model;
    this.options = options;
    this.client = this.Model.instance.client;
    this.query = this.client.table(this.Model.tableName)
      .select();

    if (this.options.single) {
      this.query = this.query.limit(1);
    }

    return this;
  }

  limit (amount) {
    if (!this.options.single) {
      this.query = this.query.limit(amount);
    }
    return this;
  }

  skip (amount) {
    this.query = this.query.offset(amount);
    return this;
  }

  sort (...args) {
    const [field, direction] = normalizeSortArgs(...args);
    if (!field || !direction) {
      return this;
    }
    if (!this.Model.schema.fields[field]) {
      return this;
    }

    this.query = this.query.orderBy(field, direction);
    return this;
  }

  where (filters = {}) {
    filters = pick(filters, Object.keys(this.Model.schema.fields));
    this.query = this.query.where(filters);
    return this;
  }

  then (callback) {
    return this.query
      .then((results) => {
        return results.map((record) => new this.Model(record));
      })
      .then((records) => {
        if (!this.options.single) {
          return records;
        }
        return records.length ? records[0] : null;
      })
      .then((records) => callback(records));
  }

  catch (callback) {
    return this.query.catch(callback);
  }
}

module.exports = Query;
