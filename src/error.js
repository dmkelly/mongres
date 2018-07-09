function isConflictError(err) {
  return err.code === '23505';
}

class GenericError extends Error {
  constructor(err) {
    super(err.message);

    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor);
    } else {
      this.stack = new Error(err.message).stack;
    }
  }
}

class ConflictError extends GenericError {}
class ValidationError extends GenericError {
  constructor(message, details) {
    super({ message });
    this.details = details;
  }
}

module.exports = {
  isConflictError,
  ConflictError,
  ValidationError
};
