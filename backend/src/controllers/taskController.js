const taskService = require('../services/taskService');
const { successResponse } = require('../utils/response');

class TaskController {
  async createTask(req, res, next) {
    try {
      const task = await taskService.createTask(req.user._id, req.body);
      return successResponse(res, 201, 'Task created successfully', task);
    } catch (error) {
      next(error);
    }
  }

  async getTasks(req, res, next) {
    try {
      const { tasks, pagination } = await taskService.getTasks(req.user._id, req.query);
      return successResponse(res, 200, 'Tasks retrieved successfully', tasks, pagination);
    } catch (error) {
      next(error);
    }
  }

  async getTaskById(req, res, next) {
    try {
      const task = await taskService.getTaskById(req.user._id, req.params.id);
      return successResponse(res, 200, 'Task retrieved successfully', task);
    } catch (error) {
      next(error);
    }
  }

  async updateTask(req, res, next) {
    try {
      const task = await taskService.updateTask(req.user._id, req.params.id, req.body);
      return successResponse(res, 200, 'Task updated successfully', task);
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req, res, next) {
    try {
      const task = await taskService.updateTaskStatus(req.user._id, req.params.id, req.body.status);
      return successResponse(res, 200, 'Task status updated successfully', task);
    } catch (error) {
      next(error);
    }
  }

  async deleteTask(req, res, next) {
    try {
      await taskService.deleteTask(req.user._id, req.params.id);
      return successResponse(res, 200, 'Task deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  async getStats(req, res, next) {
    try {
      const stats = await taskService.getTaskStats(req.user._id);
      return successResponse(res, 200, 'Task statistics retrieved successfully', stats);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TaskController();
