const authService = require('../services/authService');
const { setAuthCookie, clearAuthCookie } = require('../utils/token');
const { successResponse } = require('../utils/response');

class AuthController {
  async register(req, res, next) {
    try {
      const { name, email, password } = req.body;
      const result = await authService.register({ name, email, password });

      // Do NOT set auth cookie before email verification
      return successResponse(res, 201, result.message, {
        user: result.user,
        isEmailVerified: false,
      });
    } catch (error) {
      next(error);
    }
  }

  async verifyEmail(req, res, next) {
    try {
      const { email, otp } = req.body;
      const result = await authService.verifyEmail({ email, otp });

      return successResponse(res, 200, result.message, {
        user: result.user,
        alreadyVerified: result.alreadyVerified,
      });
    } catch (error) {
      next(error);
    }
  }

  async resendOtp(req, res, next) {
    try {
      const { email } = req.body;
      const result = await authService.resendOtp({ email });

      return successResponse(res, 200, result.message, {
        alreadyVerified: result.alreadyVerified,
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const { user, token } = await authService.login({ email, password });

      // Store JWT in HttpOnly cookie upon successful login for verified accounts
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

  async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;
      const result = await authService.forgotPassword({ email });

      return successResponse(res, 200, result.message);
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req, res, next) {
    try {
      const { token, password } = req.body;
      const result = await authService.resetPassword({ token, password });

      return successResponse(res, 200, result.message);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
