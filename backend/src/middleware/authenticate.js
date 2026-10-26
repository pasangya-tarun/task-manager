const { verifyToken, COOKIE_NAME } = require('../utils/token');
const { errorResponse } = require('../utils/response');
const User = require('../models/User');

/**
 * Authentication Middleware
 * Validates JWT from HttpOnly cookie or Authorization Bearer header,
 * verifies account existence and active status.
 */
const authenticate = async (req, res, next) => {
  try {
    let token = null;

    // 1. Check HttpOnly cookie first (preferred browser strategy)
    if (req.cookies && req.cookies[COOKIE_NAME]) {
      token = req.cookies[COOKIE_NAME];
    } else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      // 2. Fallback to Authorization: Bearer <token> for testing/API clients
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return errorResponse(res, 401, 'Authentication required. Please log in.');
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (jwtErr) {
      if (jwtErr.name === 'TokenExpiredError') {
        return errorResponse(res, 401, 'Session expired. Please log in again.');
      }
      return errorResponse(res, 401, 'Invalid authentication token.');
    }

    // Ensure user still exists
    const user = await User.findById(decoded.sub);
    if (!user) {
      return errorResponse(res, 401, 'User account no longer exists.');
    }

    // Invalidate session if password was reset or tokenVersion changed
    if (
      decoded.tokenVersion !== undefined &&
      user.tokenVersion !== undefined &&
      decoded.tokenVersion !== user.tokenVersion
    ) {
      return errorResponse(
        res,
        401,
        'Session invalidated due to password change. Please log in again.'
      );
    }

    // Account active check
    if (!user.isActive) {
      return errorResponse(
        res,
        403,
        'Your account has been deactivated. Please contact an administrator.'
      );
    }

    // Email verification check
    if (!user.isEmailVerified) {
      return errorResponse(
        res,
        403,
        'Please verify your email address to access this resource.',
        null,
        { code: 'EMAIL_NOT_VERIFIED', email: user.email }
      );
    }

    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = authenticate;
