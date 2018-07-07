const {
  getRelationTableName,
  groupBy,
  keyBy,
  mapToLookup: toColumns
} = require('../../../utils');
const { getBackRefFields } = require('../../model');
const { hasNestedFields } = require('../../schema');
const Adaptor = require('./adaptor');

class Populate extends Adaptor {
  static exists(query, Ref, field) {
    return query.adaptors.some(adaptor => {
      return (
        adaptor.name === 'Populate' &&
        adaptor.Ref.tableName === Ref.tableName &&
        adaptor.field.fieldName === field.fieldName
      );
    });
  }

  constructor(query, Ref, field) {
    super(query);

    this.name = 'Populate';
    this.Ref = Ref;
    this.field = field;

    this.isSelfContained =
      !this.field.isMulti &&
      !this.Ref.children.length &&
      !this.Ref.Parent &&
      !hasNestedFields(this.Ref.schema);

    if (this.isSelfContained) {
      this.query.query = this.query.query
        .leftJoin(
          this.Ref.tableName,
          `${this.query.Model.tableName}.${field.columnName}`,
          `${this.Ref.tableName}.id`
        )
        .column(toColumns(super.getFieldsList(Ref)));
    }
  }

  async reconcile(results) {
    if (this.isSelfContained) {
      return await results;
    }

    const fieldName = this.field.fieldName;
    const resultIds = results.map(document => document.id);

    if (!this.field.isMulti) {
      const linkedDocuments = await this.Ref.find({
        id: {
          $in: resultIds
        }
      });
      const lookup = linkedDocuments.reduce((lookup, document) => {
        lookup[document.id] = document;
        return lookup;
      }, {});
      return results.map(result => {
        result[fieldName] = lookup[result[fieldName]];
        return result;
      });
    }

    const [backRefField] = getBackRefFields(this.query.Model, this.Ref.schema);

    if (!backRefField || backRefField.isMulti) {
      // many to many
      const joinTable = getRelationTableName([this.query.Model, this.Ref]);
      const [linkedDocuments, links] = await Promise.all([
        this.Ref.find().where((builder, knex) => {
          const subquery = knex
            .table(joinTable)
            .where(this.query.Model.tableName, 'in', resultIds)
            .select(this.Ref.tableName);

          builder.where('id', 'in', subquery);
        }),
        this.query.client
          .table(joinTable)
          .where(this.query.Model.tableName, 'in', resultIds)
      ]);

      const groupedRefs = groupBy(links, record => {
        return record[this.query.Model.tableName];
      });
      const refs = keyBy(linkedDocuments, 'id');

      return results.map(result => {
        const linkRows = groupedRefs[result.id];
        if (!linkRows) {
          return result;
        }
        result[fieldName] = linkRows.map(row => refs[row[this.Ref.tableName]]);
        return result;
      });
    }

    // one to many
    const linkedDocuments = await this.Ref.find({
      [backRefField.columnName]: {
        $in: resultIds
      }
    });

    const groupedRefs = groupBy(linkedDocuments, document => {
      return document[backRefField.columnName];
    });
    return results.map(result => {
      result[fieldName] = groupedRefs[result.id] || [];
      return result;
    });
  }

  toModel(lookups, document) {
    const refRecord = lookups[this.Ref.tableName];
    if (!refRecord) {
      return document;
    }
    const refDocument = new this.Ref(refRecord);
    refDocument.isNew = false;
    document[this.field.fieldName] = refDocument;
    return document;
  }
}

module.exports = Populate;
