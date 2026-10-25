const userService = require('../services/userService');
const { successResponse } = require('../utils/response');

class UserController {
  async getProfile(req, res, next) {
    try {
      const profile = await userService.getProfile(req.user._id);
      return successResponse(res, 200, 'User profile retrieved', profile);
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req, res, next) {
    try {
      const updated = await userService.updateProfile(req.user._id, req.body);
      return successResponse(res, 200, 'Profile updated successfully', updated);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UserController();
