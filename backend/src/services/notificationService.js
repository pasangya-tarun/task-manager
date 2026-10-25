const Notification = require('../models/Notification');

class NotificationService {
  /**
   * Get paginated notifications for the authenticated user (newest first)
   */
  async getUserNotifications(userId, { page = 1, limit = 10, isRead } = {}) {
    const filter = { user: userId };

    if (typeof isRead === 'boolean') {
      filter.isRead = isRead;
    }

    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('task', 'title dueDate status priority'),
      Notification.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      notifications,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Get total unread notifications count for the authenticated user
   */
  async getUnreadCount(userId) {
    const unreadCount = await Notification.countDocuments({
      user: userId,
      isRead: false,
    });

    return { unreadCount };
  }

  /**
   * Mark a single notification as read ensuring ownership
   */
  async markAsRead(userId, notificationId) {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, user: userId },
      { $set: { isRead: true } },
      { new: true }
    ).populate('task', 'title dueDate status priority');

    if (!notification) {
      const error = new Error('Notification not found');
      error.statusCode = 404;
      throw error;
    }

    return notification;
  }

  /**
   * Mark all notifications belonging to the authenticated user as read
   */
  async markAllAsRead(userId) {
    const result = await Notification.updateMany(
      { user: userId, isRead: false },
      { $set: { isRead: true } }
    );

    return { modifiedCount: result.modifiedCount || 0 };
  }

  /**
   * Delete a notification ensuring ownership
   */
  async deleteNotification(userId, notificationId) {
    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      user: userId,
    });

    if (!notification) {
      const error = new Error('Notification not found');
      error.statusCode = 404;
      throw error;
    }

    return { id: notificationId };
  }
}

module.exports = new NotificationService();
