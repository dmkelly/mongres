class GenericError extends Error {
  constructor (err) {
    super(err.message);

    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor);
    } else {
      this.stack = (new Error(err.message)).stack;
    }
  }
}

class ConflictError extends GenericError {}

module.exports = {
  ConflictError
};
