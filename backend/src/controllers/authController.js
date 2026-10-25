const authService = require('../services/authService');
const { setAuthCookie, clearAuthCookie } = require('../utils/token');
const { successResponse } = require('../utils/response');

class AuthController {
  async register(req, res, next) {
    try {
      const { name, email, password } = req.body;
      const { user, token } = await authService.register({ name, email, password });

      // Preferred browser implementation: store JWT in HttpOnly cookie
      setAuthCookie(res, token);

      return successResponse(res, 201, 'Registration successful', { user, token });
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const { user, token } = await authService.login({ email, password });

      // Preferred browser implementation: store JWT in HttpOnly cookie
      setAuthCookie(res, token);

      return successResponse(res, 200, 'Login successful', { user, token });
    } catch (error) {
      next(error);
    }
  }

  async logout(req, res, next) {
    try {
      clearAuthCookie(res);
      return successResponse(res, 200, 'Logged out successfully');
    } catch (error) {
      next(error);
    }
  }

  async getMe(req, res, next) {
    try {
      return successResponse(res, 200, 'Authenticated user data retrieved', {
        user: req.user.toJSON(),
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
