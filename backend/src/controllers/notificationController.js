const notificationService = require('../services/notificationService');
const { successResponse } = require('../utils/response');

class NotificationController {
  async getNotifications(req, res, next) {
    try {
      const { notifications, pagination } = await notificationService.getUserNotifications(
        req.user._id,
        req.query
      );
      return successResponse(
        res,
        200,
        'Notifications retrieved successfully',
        notifications,
        pagination
      );
    } catch (error) {
      next(error);
    }
  }

  async getUnreadCount(req, res, next) {
    try {
      const countData = await notificationService.getUnreadCount(req.user._id);
      return successResponse(res, 200, 'Unread notification count retrieved', countData);
    } catch (error) {
      next(error);
    }
  }

  async markAsRead(req, res, next) {
    try {
      const notification = await notificationService.markAsRead(
        req.user._id,
        req.params.id
      );
      return successResponse(res, 200, 'Notification marked as read', notification);
    } catch (error) {
      next(error);
    }
  }

  async markAllAsRead(req, res, next) {
    try {
      const result = await notificationService.markAllAsRead(req.user._id);
      return successResponse(res, 200, 'All notifications marked as read', result);
    } catch (error) {
      next(error);
    }
  }

  async deleteNotification(req, res, next) {
    try {
      await notificationService.deleteNotification(req.user._id, req.params.id);
      return successResponse(res, 200, 'Notification deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new NotificationController();
