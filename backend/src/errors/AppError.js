// Base class every custom error extends. `isOperational` distinguishes
// "expected" errors (bad input, not found, wrong role -- safe to show the
// message to the client) from genuine bugs (isOperational=false, meaning
// the error handler logs the full stack and returns a generic message,
// never leaking internals).
class AppError extends Error {
  constructor(message, statusCode, code, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
