const jwt = require('jsonwebtoken');
const env = require('../config/env');

const COOKIE_NAME = 'token';

/**
 * Generate a signed JWT access token for a user
 * @param {Object} user 
 * @returns {string} Signed JWT
 */
const generateToken = (user) => {
  const payload = {
    sub: user._id.toString(),
    email: user.email,
    role: user.role,
    tokenVersion: user.tokenVersion || 0,
  };

  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
};

/**
 * Verify a JWT access token
 * @param {string} token 
 * @returns {Object} Decoded payload
 */
const verifyToken = (token) => {
  return jwt.verify(token, env.JWT_SECRET);
};

/**
 * Configure and attach the HttpOnly authentication cookie
 * @param {Object} res Express response
 * @param {string} token JWT token string
 */
const setAuthCookie = (res, token) => {
  const isProduction = env.NODE_ENV === 'production';
  // 15 minutes default in ms or parse from JWT_EXPIRES_IN
  const maxAgeMs = 15 * 60 * 1000;

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: maxAgeMs,
    path: '/',
  });
};

/**
 * Clear the authentication cookie upon logout
 * @param {Object} res Express response
 */
const clearAuthCookie = (res) => {
  const isProduction = env.NODE_ENV === 'production';

  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    path: '/',
  });
};

module.exports = {
  COOKIE_NAME,
  generateToken,
  verifyToken,
  setAuthCookie,
  clearAuthCookie,
};
