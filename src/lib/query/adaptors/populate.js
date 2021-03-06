const {
  getRelationTableName,
  groupBy,
  isNil,
  keyBy,
  mapToLookup: toColumns
} = require('../../../utils');
const { getTypeModel } = require('../../field');
const { getBackRefFields } = require('../../model');
const ModelList = require('../../modelList');
const { hasNestedFields } = require('../../schema');
const Adaptor = require('./adaptor');
const ChildrenAdaptor = require('./children');
const ParentAdaptor = require('./parent');

async function attachRefNested(attachField, backRefField, refDocuments, query) {
  const results = await query;
  const resultsLookup = results.reduce((lookup, document) => {
    const lookupKey = document[backRefField.fieldName];
    if (!lookup[lookupKey]) {
      lookup[lookupKey] = new ModelList(attachField.type);
    }
    lookup[lookupKey].push(document);
    return lookup;
  }, {});

  return refDocuments.map(document => {
    const populatedDocument = resultsLookup[document.id];
    if (populatedDocument) {
      document[attachField.fieldName] = populatedDocument;
    }
    return document;
  });
}

async function attachRefSingleAutoPopulate(attachField, refDocuments, query) {
  const results = await query;
  const resultsLookup = keyBy(results, 'id');

  return refDocuments.map(document => {
    const populatedDocument = resultsLookup[document[attachField.fieldName]];
    if (populatedDocument) {
      document[attachField.fieldName] = populatedDocument;
    }
    return document;
  });
}

async function attachRefMultiAutoPopulate(
  Ref,
  attachField,
  refDocuments,
  refQuery,
  joinQuery
) {
  const [results, links] = await Promise.all([refQuery, joinQuery]);
  const resultsLookup = keyBy(results, 'id');
  const MultiModel = getTypeModel(attachField);
  const baseJoinFieldName = Ref.tableName;
  const multiJoinFieldName = MultiModel.tableName;

  const joinLookup = links.reduce((lookup, link) => {
    const baseId = link[baseJoinFieldName];
    if (!lookup[baseId]) {
      lookup[baseId] = new ModelList(MultiModel);
    }

    const multiDocument = resultsLookup[link[multiJoinFieldName]];

    if (multiDocument) {
      lookup[baseId].push(multiDocument);
    }
    return lookup;
  }, {});

  return refDocuments.map(document => {
    const multiDocuments = joinLookup[document.id];
    if (multiDocuments) {
      document[attachField.fieldName] = multiDocuments;
    }
    return document;
  });
}

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
    this.adaptors = [];
    this.columns = [];

    // Determine if the query was able to include all the data with a join
    this.isSelfContained =
      !this.field.isMulti &&
      !this.Ref.children.length &&
      !this.Ref.Parent &&
      !hasNestedFields(this.Ref.schema);

    if (!this.field.isMulti) {
      this.query.query = this.query.query.leftJoin(
        this.Ref.tableName,
        `${this.query.Model.tableName}.${field.columnName}`,
        `${this.Ref.tableName}.id`
      );
      this.columns = super.getFieldsList(Ref);
    }

    if (Ref.children.length) {
      this.adaptors.push(new ChildrenAdaptor(query, Ref));
    }
    if (Ref.Parent) {
      this.adaptors.push(new ParentAdaptor(query, Ref));
    }
  }

  getFieldsList() {
    return this.adaptors.reduce((fields, adaptor) => {
      const adaptorFields = adaptor.getFieldsList();
      adaptorFields.forEach(adaptorField => {
        const isFieldInList = !!fields.find(field => field === adaptorField);
        if (!isFieldInList) {
          fields.push(adaptorField);
        }
      });
      return fields;
    }, this.columns);
  }

  async reconcile(results) {
    const fieldName = this.field.fieldName;

    if (this.isSelfContained) {
      return await results;
    }

    if (!this.field.isMulti) {
      const refDocuments = results.map(document => document[fieldName]);
      const refFields = Object.values(this.Ref.schema.fields);
      const populateRefs = refFields.reduce((populates, field) => {
        if (!field.isNested && !field.autoPopulate) {
          return populates;
        }

        const RefModel = getTypeModel(field);

        if (field.isNested) {
          const joinIds = results.reduce((ids, document) => {
            if (document[fieldName] && !isNil(document[fieldName].id)) {
              ids.push(document[fieldName].id);
            }
            return ids;
          }, []);
          const [backRefField] = getBackRefFields(this.Ref, RefModel.schema);
          const query = RefModel.find({
            [backRefField.fieldName]: {
              $in: joinIds
            }
          });
          populates.push(
            attachRefNested(field, backRefField, refDocuments, query)
          );
        } else if (field.autoPopulate) {
          const joinIds = results.reduce((ids, document) => {
            const refDocument = document[fieldName];
            if (refDocument && !isNil(refDocument[field.fieldName])) {
              ids.push(refDocument[field.fieldName]);
            }
            return ids;
          }, []);

          if (field.isMulti) {
            const joinTable = getRelationTableName([this.Ref, RefModel]);
            const resultIds = refDocuments.map(document => document.id);
            const query = RefModel.find().where((builder, knex) => {
              const subquery = knex
                .table(joinTable)
                .where(this.Ref.tableName, 'in', resultIds)
                .select(RefModel.tableName);

              builder.where('id', 'in', subquery);
            });
            const joinQuery = this.query.client
              .table(joinTable)
              .where(this.Ref.tableName, 'in', resultIds);

            populates.push(
              attachRefMultiAutoPopulate(
                this.Ref,
                field,
                refDocuments,
                query,
                joinQuery
              )
            );
          } else {
            const query = RefModel.find({
              id: {
                $in: joinIds
              }
            });
            populates.push(
              attachRefSingleAutoPopulate(field, refDocuments, query)
            );
          }
        }

        return populates;
      }, []);

      if (populateRefs.length) {
        await Promise.all(populateRefs);
      }

      const resultIds = results.reduce((resultIds, document) => {
        const reference = document[fieldName];
        if (reference instanceof this.Ref) {
          return resultIds;
        }
        return reference;
      }, []);

      if (!resultIds.length) {
        // Already populated (this can happen with a combination of populate and
        // nested or inheritance)
        return results;
      }

      const linkedDocuments = await this.Ref.find({
        id: {
          $in: resultIds
        }
      });
      const lookup = keyBy(linkedDocuments, 'id');

      return results.map(result => {
        const reference = result[fieldName];
        if (reference instanceof this.Ref) {
          return result;
        }
        result[fieldName] = lookup[reference];
        return result;
      });
    }

    const resultIds = results.map(document => document.id);
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

    const refDocument = this.adaptors.reduce((refDocument, adaptor) => {
      return adaptor.toModel(lookups, refDocument, this.Ref);
    }, new this.Ref(refRecord));
    refDocument.isNew = false;

    document[this.field.fieldName] = refDocument;
    return document;
  }
}

module.exports = Populate;
