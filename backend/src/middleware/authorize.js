const { errorResponse } = require('../utils/response');

/**
 * Role-based authorization middleware
 * @param  {...string} allowedRoles Roles permitted to access the route
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 401, 'Authentication required');
    }

    if (!allowedRoles.includes(req.user.role)) {
      return errorResponse(
        res,
        403,
        'Access denied. Insufficient permissions for this resource.'
      );
    }

    next();
  };
};

module.exports = authorize;
