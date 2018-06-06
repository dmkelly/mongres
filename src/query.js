const {
  ensureColumnNamespace,
  getFieldsList,
  getWhereBuilder,
  normalizeSortArgs,
  toColumns,
  toModel
} = require('./lib/query');
const { getBackRefFields } = require('./lib/model');
const { isFunction, pick } = require('./utils');

class Join {
  constructor ({ fieldName, Model }) {
    this.fieldName = fieldName;
    this.Model = Model;
  }
}

class Query {
  constructor (Model, options = {}) {
    this.Model = Model;
    this.options = options;
    this.client = this.Model.instance.client;
    this.query = this.client.table(this.Model.tableName)
      .select()
      .column(toColumns(getFieldsList(this.Model)));
    this.joins = {};

    if (this.Model.children.length) {
      for (let Child of this.Model.children) {
        this.query = this.query.leftJoin(
          Child.tableName,
          `${this.Model.tableName}.id`,
          `${Child.tableName}.id`
        );
      }
    }

    if (this.Model.Parent) {
      this.query = this.query.join(
        this.Model.Parent.tableName,
        `${this.Model.tableName}.id`,
        `${this.Model.Parent.tableName}.id`
      );
    }

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
        const field = schema.fields[fieldName];
        const columnName = ensureColumnNamespace(field, this.Model);
        return query.where(getWhereBuilder(this, columnName, filter));
      }, this.query);

    return this;
  }

  then (callback) {
    return this.query
      .then(async (results) => {
        const nestedFields = Object.values(this.Model.schema.fields)
          .filter((field) => field.isNested);

        if (!nestedFields.length) {
          return results.map((record) => toModel(record, this));
        }

        const idField = `${this.Model.tableName}.id`;
        const nestedResults = await Promise.all(nestedFields.map((field) => {
          const backRefField = getBackRefFields(this.Model, field.type.schema)[0];

          return new Query(field.type).where({
            [backRefField.fieldName]: {
              $in: results.map(item => item[idField])
            }
          });
        }));

        return results.map((record) => {
          for (let i = 0; i < nestedFields.length; i += 1) {
            const field = nestedFields[i];
            const backRefField = getBackRefFields(this.Model, field.type.schema)[0];
            const results = nestedResults[i].filter((item) => {
              return item[backRefField.fieldName] === record[idField];
            });

            // Namespace with table name so `toModel` knows how to convert the
            // record data to the model
            const attachKey = `${this.Model.tableName}.${field.fieldName}`;
            record[attachKey] = results;
          }

          return toModel(record, this);
        });
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
