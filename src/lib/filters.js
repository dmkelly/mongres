module.exports = {
  $eq: (builder, fieldName, value) => {
    return builder.where(fieldName, value);
  },

  $exists: (builder, fieldName, value) => {
    if (value) {
      return builder.whereNotNull(fieldName);
    }
    return builder.whereNull(fieldName);
  },

  $gt: (builder, fieldName, value) => {
    return builder.where(fieldName, '>', value);
  },

  $gte: (builder, fieldName, value) => {
    return builder.where(fieldName, '>=', value);
  },

  $in: (builder, fieldName, value) => {
    return builder.whereIn(fieldName, value);
  },

  $lt: (builder, fieldName, value) => {
    return builder.where(fieldName, '<', value);
  },

  $lte: (builder, fieldName, value) => {
    return builder.where(fieldName, '<=', value);
  },

  $ne: (builder, fieldName, value) => {
    return builder.whereNot(fieldName, value);
  },

  $nin: (builder, fieldName, value) => {
    return builder.whereNotIn(fieldName, value);
  }
};
