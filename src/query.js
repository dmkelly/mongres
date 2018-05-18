const { getTableModel, normalizeSortArgs, getWhereBuilder } = require('./lib/query');
const { isFunction, pick, setIn } = require('./utils');

class Join {
  constructor ({ fieldName, Model }) {
    this.fieldName = fieldName;
    this.Model = Model;
  }
}

function ensureColumnNamespace (fieldName, Model) {
  if (fieldName.includes('.')) {
    return fieldName;
  }
  return `${Model.tableName}.${fieldName}`;
}

function getFieldsList (Model) {
  return Object.keys(Model.schema.fields)
    .map((field) => ensureColumnNamespace(field, Model));
}

function toColumns (fieldsList) {
  return fieldsList.map(field => {
    const obj = {};
    obj[field] = field;
    return obj;
  });
}

function toModel (record, query) {
  const lookups = Object.entries(record)
    .reduce((lookup, [columnName, value]) => {
      setIn(lookup, columnName, value);
      return lookup;
    }, {});
  const documents = Object.entries(lookups)
    .reduce((documents, [tableName, record]) => {
      const Model = getTableModel(query, tableName);

      if (!Model) {
        return documents;
      }

      const document = new Model(record);
      document.isNew = false;

      documents[tableName] = document;

      return documents;
    }, {});
  const baseDoc = documents[query.Model.tableName];
  Object.values(query.joins)
    .forEach((join) => {
      baseDoc[join.fieldName] = documents[join.Model.tableName];
    });

  return baseDoc;
}

class Query {
  constructor (Model, options) {
    this.Model = Model;
    this.options = options;
    this.client = this.Model.instance.client;
    this.query = this.client.table(this.Model.tableName)
      .select()
      .column(toColumns(getFieldsList(this.Model)));
    this.joins = {};

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

  populate (fieldName) {
    const schema = this.Model.schema;
    const field = schema.fields[fieldName];
    if (!field || !field.ref) {
      return this;
    }

    const Ref = this.Model.instance.model(field.ref);
    if (!Ref) {
      return this;
    }

    this.query = this.query.leftJoin(
      Ref.tableName,
      `${this.Model.tableName}.${fieldName}`,
      `${Ref.tableName}.id`
    )
      .column(toColumns(getFieldsList(Ref)));
    this.joins[Ref.tableName] = new Join({
      fieldName,
      Model: Ref
    });

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
    if (isFunction(filters)) {
      this.query = this.query.where(filters);
      return this;
    }

    const schema = this.Model.schema;
    filters = pick(filters, Object.keys(schema.fields));

    this.query = Object.entries(filters)
      .reduce((query, [fieldName, filter]) => {
        const columnName = ensureColumnNamespace(fieldName, this.Model);
        return query.where(getWhereBuilder(this, columnName, filter));
      }, this.query);

    return this;
  }

  then (callback) {
    return this.query
      .then((results) => {
        return results.map((record) => toModel(record, this));
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
