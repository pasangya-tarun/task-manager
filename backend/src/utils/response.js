/**
 * Standardized Success Response Helper
 * @param {Object} res Express response object
 * @param {number} statusCode HTTP status code
 * @param {string} message Human readable message
 * @param {any} data Response payload
 * @param {Object} [meta] Optional metadata (pagination, counts, etc.)
 */
const successResponse = (res, statusCode = 200, message = 'Success', data = null, meta = undefined) => {
  const response = {
    success: true,
    message,
    data,
  };

  if (meta !== undefined) {
    response.meta = meta;
  }

  return res.status(statusCode).json(response);
};

/**
 * Standardized Error Response Helper
 * @param {Object} res Express response object
 * @param {number} statusCode HTTP status code
 * @param {string} message Error summary message
 * @param {any} [errors] Detailed validation or error breakdown
 */
const errorResponse = (res, statusCode = 500, message = 'An error occurred', errors = null) => {
  const response = {
    success: false,
    message,
  };

  if (errors !== null) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
};

module.exports = {
  successResponse,
  errorResponse,
};
