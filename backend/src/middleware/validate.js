const { z } = require('zod');
const { errorResponse } = require('../utils/response');

/**
 * Higher-order middleware to validate incoming request parts using Zod schemas
 * @param {z.ZodSchema} schema Zod validation schema
 * @param {'body' | 'query' | 'params'} [source='body'] Request property to validate
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      const parsed = schema.parse(req[source]);
      req[source] = parsed; // Replace with sanitized / transformed data
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formattedErrors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        return errorResponse(
          res,
          400,
          formattedErrors[0]?.message || 'Validation failed',
          formattedErrors
        );
      }
      return next(error);
    }
  };
};

module.exports = validate;
