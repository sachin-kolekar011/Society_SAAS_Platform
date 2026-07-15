const logger = require('../config/logger');
const env = require('../config/env');
const AppError = require('../errors/AppError');

// Mounted LAST in app.js, after every route. Express recognizes it as an
// error handler because it takes 4 arguments.
function errorHandlerMiddleware(err, req, res, next) { // eslint-disable-line no-unused-vars
  const isKnown = err instanceof AppError;

  const statusCode = isKnown ? err.statusCode : 500;
  const code = isKnown ? err.code : 'INTERNAL_ERROR';
  // Never leak internal error messages to the client for unexpected errors --
  // that's the whole point of the isOperational split.
  const message = isKnown ? err.message : 'Something went wrong. Please try again.';

  logger.log(isKnown && err.isOperational ? 'warn' : 'error', err.message, {
    requestId: req.id,
    tenantId: req.tenant?.id,
    userId: req.user?.id,
    path: req.originalUrl,
    stack: err.stack,
  });

  const responseBody = {
    success: false,
    error: { code, message },
  };

  if (isKnown && err.details) {
    responseBody.error.details = err.details;
  }

  // Stack traces only in non-production, and only for genuinely unexpected
  // errors -- never for operational errors, which aren't bugs.
  if (!env.isProduction && !isKnown) {
    responseBody.error.stack = err.stack;
  }

  res.status(statusCode).json(responseBody);
}

module.exports = errorHandlerMiddleware;
