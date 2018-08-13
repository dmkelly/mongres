const Query = require('./query');
const { castError } = require('./utils');

function count(Model) {
  return function count(filters = {}) {
    return find(Model)(filters).count();
  };
}

function create(Model) {
  return async function create(data, { transaction } = {}) {
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
  return function find(filters = {}) {
    return new Query(Model, {}).where(filters);
  };
}

function findOne(Model) {
  return function findOne(filters = {}) {
    return new Query(Model, {
      single: true
    }).where(filters);
  };
}

function findById(Model) {
  return function findById(id) {
    return findOne(Model)({ id });
  };
}

function remove(Model) {
  return async function remove(filters, { transaction } = {}) {
    if (!filters) {
      throw await new Error('Model.remove() requires conditions');
    }

    if (Model.Parent) {
      // Remove corresponding parents and rely on foreign key cascades to remove
      // children
      return Model.Parent.remove(builder => {
        const subquery = new Query(Model, {
          raw: true,
          transaction
        })
          .columns([Model.Parent.tableName])
          .where(filters).query;
        builder.where('id', 'in', subquery);
      });
    }

    const result = await new Query(Model, {
      operation: Query.operations.DELETE,
      transaction
    }).where(filters);

    return {
      nModified: result
    };
  };
}

function update(Model, instance) {
  return async function update(filters, changes, { transaction } = {}) {
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
  count,
  create,
  find,
  findOne,
  findById,
  remove,
  update
};
