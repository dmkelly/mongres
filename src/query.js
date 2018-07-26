const {
  adaptors,
  ensureColumnNamespace,
  getFieldsList,
  getWhereBuilder,
  normalizeSortArgs,
  toModel
} = require('./lib/query');
const { isFunction, mapToLookup: toColumns, pick } = require('./utils');

class Query {
  constructor(Model, options = {}) {
    this.Model = Model;
    this.options = options;
    this.client = this.Model.instance.client;

    this.query = this.client.table(this.Model.tableName);
    this.query = this.query.select();
    this.adaptors = [];

    const baseFields = Object.values(this.Model.schema.fields);

    if (this.Model.children.length) {
      this.adaptors.push(new adaptors.Children(this));
    }
    if (this.Model.Parent) {
      this.adaptors.push(new adaptors.Parent(this));
    }

    baseFields.forEach(field => {
      if (field.isNested) {
        this.adaptors.push(new adaptors.Nested(this, field));
      }
    });

    this.query = this.query.column(toColumns(getFieldsList(this)));

    if (this.options.single) {
      this.query = this.query.limit(1);
    }

    baseFields.forEach(field => {
      if (field.autoPopulate) {
        this.populate(field.fieldName);
      }
    });

    return this;
  }

  limit(amount) {
    if (!this.options.single) {
      this.query = this.query.limit(amount);
    }
    return this;
  }

  populate(fieldName) {
    const schema = this.Model.schema;
    const field = schema.fields[fieldName];
    const refExists = !!(field && field.ref);
    const parentExists = !!(field && this.Model.Parent);
    const isParent = parentExists && fieldName === this.Model.Parent.tableName;

    if (!refExists && !isParent) {
      return this;
    }

    const Ref = isParent
      ? this.Model.Parent
      : this.Model.instance.model(field.ref);
    if (!Ref) {
      return this;
    }

    if (!adaptors.Populate.exists(this, Ref, field)) {
      this.adaptors.push(new adaptors.Populate(this, Ref, field));
    }

    return this;
  }

  skip(amount) {
    this.query = this.query.offset(amount);
    return this;
  }

  sort(...args) {
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

  where(filters = {}) {
    if (isFunction(filters)) {
      const client = this.client;
      this.query = this.query.where(function(builder) {
        filters.call(this, builder, client);
      });
      return this;
    }

    const schema = this.Model.schema;
    filters = pick(filters, Object.keys(schema.fields));

    this.query = Object.entries(filters).reduce(
      (query, [fieldName, filter]) => {
        const field = schema.fields[fieldName];
        const columnName = ensureColumnNamespace(this, field);
        return query.where(getWhereBuilder(this, columnName, filter));
      },
      this.query
    );

    return this;
  }

  exec() {
    return this.query
      .then(records => records.map(record => toModel(record, this)))
      .then(async results => {
        for (let adaptor of this.adaptors) {
          results = await adaptor.reconcile(results);
        }
        return results;
      })
      .then(records => {
        if (!this.options.single) {
          return records;
        }
        return records.length ? records[0] : null;
      });
  }

  then(resolve, reject) {
    return this.exec().then(resolve, reject);
  }

  catch(reject) {
    return this.query.exec().then(null, reject);
  }
}

module.exports = Query;
