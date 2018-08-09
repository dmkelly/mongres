const {
  adaptors,
  ensureColumnNamespace,
  getFieldsList,
  getWhereBuilder,
  normalizeSortArgs,
  toModel
} = require('./lib/query');
const { isFunction, mapToLookup: toColumns, pick } = require('./utils');

const defaultOptions = {
  operation: 'select',
  raw: false,
  single: false,
  transaction: null
};

class Query {
  constructor(Model, options = {}) {
    this.Model = Model;
    this.options = Object.assign({}, defaultOptions, options);

    if (!this.options.table) {
      this.options.table = this.Model.tableName;
    }

    this.client = this.Model.instance.client;
    this.fields = null;

    this.query = this.client.table(this.options.table);
    this.query = this.query[this.options.operation]();
    if (this.options.transaction) {
      this.query = this.query.transacting(this.options.transaction);
    }

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

  columns(columns) {
    this.fields = columns;
    this.query = this.query.column(columns);
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
      throw new Error(`Field ${field.fieldName} does not support populate`);
    }

    const Ref = isParent
      ? this.Model.Parent
      : this.Model.instance.model(field.ref);
    if (!Ref) {
      throw new Error(`Field ${field.fieldName} does not support populate`);
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
    const [fieldName, direction] = normalizeSortArgs(...args);
    if (!fieldName || !direction) {
      return this;
    }

    const prefixedFieldName = fieldName.includes('.')
      ? fieldName
      : `${this.Model.tableName}.${fieldName}`;

    this.query = this.query.orderBy(prefixedFieldName, direction);
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

  async exec() {
    if (!this.fields) {
      this.query = this.query.column(toColumns(getFieldsList(this)));
    }

    const result = await this.query;
    if (this.options.operation !== 'select' || this.options.raw) {
      return result;
    }

    let records = result.map(record => toModel(record, this));
    for (let adaptor of this.adaptors) {
      records = await adaptor.reconcile(records);
    }
    if (!this.options.single) {
      return records;
    }
    return records.length ? records[0] : null;
  }

  then(resolve, reject) {
    return this.exec().then(resolve, reject);
  }

  catch(reject) {
    return this.query.exec().then(null, reject);
  }

  toSQL() {
    return this.query.toSQL();
  }
}

module.exports = Query;
