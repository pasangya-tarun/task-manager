const adminService = require('../services/adminService');
const { successResponse } = require('../utils/response');

class AdminController {
  async getUsers(req, res, next) {
    try {
      const { users, pagination } = await adminService.getUsers(req.query);
      return successResponse(res, 200, 'Users retrieved successfully', users, pagination);
    } catch (error) {
      next(error);
    }
  }

  async getUserById(req, res, next) {
    try {
      const user = await adminService.getUserById(req.params.id);
      return successResponse(res, 200, 'User retrieved successfully', user);
    } catch (error) {
      next(error);
    }
  }

  async updateUserStatus(req, res, next) {
    try {
      const user = await adminService.updateUserStatus(req.params.id, req.body.isActive);
      return successResponse(res, 200, `User account ${req.body.isActive ? 'activated' : 'deactivated'} successfully`, user);
    } catch (error) {
      next(error);
    }
  }

  async updateUserRole(req, res, next) {
    try {
      const user = await adminService.updateUserRole(req.params.id, req.body.role);
      return successResponse(res, 200, `User role changed to ${req.body.role} successfully`, user);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AdminController();
