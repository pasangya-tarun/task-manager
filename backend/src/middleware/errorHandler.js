const { errorResponse } = require('../utils/response');
const env = require('../config/env');

/**
 * 404 Not Found Middleware for unknown endpoints
 */
const notFoundHandler = (req, res, next) => {
  return errorResponse(res, 404, `Endpoint not found: ${req.method} ${req.originalUrl}`);
};

/**
 * Centralized Error Handling Middleware
 */
const errorHandler = (err, req, res, next) => {
  // If headers already sent, delegate to default express error handler
  if (res.headersSent) {
    return next(err);
  }

  // Handle Mongoose Invalid ObjectId CastError
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    return errorResponse(res, 400, `Invalid ID format for parameter: ${err.path}`);
  }

  // Handle MongoDB Duplicate Key error (code 11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return errorResponse(
      res,
      409,
      `An account or resource with this ${field} already exists.`
    );
  }

  // Handle Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return errorResponse(res, 400, errors[0]?.message || 'Database validation error', errors);
  }

  // Handle Malformed JSON payload
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return errorResponse(res, 400, 'Malformed JSON payload provided in request body');
  }

  // Handle standard HTTP status errors attached to error object
  const statusCode = err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);
  const isProduction = env.NODE_ENV === 'production';

  // Do not leak stack traces or internal database errors in production
  const message = isProduction && statusCode === 500
    ? 'An unexpected internal server error occurred.'
    : err.message || 'Internal Server Error';

  if (!isProduction && statusCode === 500) {
    console.error('Unhandled Server Error:', err);
  }

  const extra = {};
  if (err.code) extra.code = err.code;
  if (err.email) extra.email = err.email;
  if (err.remainingSeconds !== undefined) extra.remainingSeconds = err.remainingSeconds;

  return errorResponse(
    res,
    statusCode,
    message,
    !isProduction && err.stack ? { stack: err.stack } : null,
    extra
  );
};

module.exports = {
  notFoundHandler,
  errorHandler,
};
