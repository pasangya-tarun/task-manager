const rateLimit = require('express-rate-limit');
const { errorResponse } = require('../utils/response');

// Strict rate limiter for authentication endpoints (login, register, forgot-password, reset-password)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 20, // Limit each IP to 20 auth requests per windowMs
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  handler: (req, res) => {
    return errorResponse(
      res,
      429,
      'Too many authentication attempts. Please try again after 15 minutes.'
    );
  },
  skip: (req) => {
    // Skip rate limiting during test executions unless explicitly enabled via x-test-rate-limit
    return process.env.NODE_ENV === 'test' && req.headers['x-test-rate-limit'] !== 'true';
  },
});

// Dedicated strict rate limiter for password reset endpoints
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return errorResponse(
      res,
      429,
      'Too many password reset requests. Please try again after 15 minutes.'
    );
  },
  skip: (req) => {
    return process.env.NODE_ENV === 'test' && req.headers['x-test-rate-limit'] !== 'true';
  },
});

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return errorResponse(
      res,
      429,
      'Too many requests. Please slow down and try again later.'
    );
  },
  skip: () => process.env.NODE_ENV === 'test',
});

module.exports = {
  authLimiter,
  passwordResetLimiter,
  apiLimiter,
};
