const Query = require('./query');
const { castError } = require('./utils');

function create(Model) {
  return async function(data, { transaction } = {}) {
    const document = new Model(data);
    let result;

    try {
      result = await document.save({ transaction });
    } catch (err) {
      throw castError(err);
    }
    return result;
  };
}

function find(Model) {
  return function(filters = {}) {
    return new Query(Model, {}).where(filters);
  };
}

function findOne(Model) {
  return function(filters = {}) {
    return new Query(Model, {
      single: true
    }).where(filters);
  };
}

function findById(Model) {
  return function(id) {
    return findOne(Model)({ id });
  };
}

function remove(Model, instance) {
  return async function(filters, { transaction } = {}) {
    if (!filters) {
      throw await new Error('Model.remove() requires conditions');
    }
    const client = instance.client;

    if (Model.Parent) {
      // Remove corresponding parents and rely on foreign key cascades to remove
      // children
      return Model.Parent.remove(builder => {
        const subquery = client
          .table(Model.tableName)
          .where(filters)
          .select(Model.Parent.tableName);
        builder.where('id', 'in', subquery);
      });
    }

    let query = client
      .table(Model.tableName)
      .where(filters)
      .del();
    if (transaction) {
      query = query.transacting(transaction);
    }

    const result = await query;
    return {
      nModified: result
    };
  };
}

function update(Model, instance) {
  return async function(filters, changes, { transaction } = {}) {
    const client = instance.client;
    let query = client
      .table(Model.tableName)
      .update(changes)
      .where(filters);
    if (transaction) {
      query = query.transacting(transaction);
    }

    const result = await query;
    return {
      nModified: result
    };
  };
}

module.exports = {
  create,
  find,
  findOne,
  findById,
  remove,
  update
};
