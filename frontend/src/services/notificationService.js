import api from './api';

const notificationService = {
  /**
   * Fetch paginated notifications for current authenticated user
   */
  getNotifications: (params = {}) => api.get('/notifications', { params }),

  /**
   * Fetch unread notification count
   */
  getUnreadCount: () => api.get('/notifications/unread-count'),

  /**
   * Mark a single notification as read
   */
  markAsRead: (id) => api.patch(`/notifications/${id}/read`),

  /**
   * Mark all notifications as read
   */
  markAllAsRead: () => api.patch('/notifications/read-all'),

  /**
   * Delete a notification
   */
  deleteNotification: (id) => api.delete(`/notifications/${id}`),
};

export default notificationService;
