const express = require('express');
const notificationController = require('../controllers/notificationController');
const authenticate = require('../middleware/authenticate');
const validate = require('../middleware/validate');
const {
  notificationIdParamSchema,
  notificationQuerySchema,
} = require('../validators/notificationValidator');

const router = express.Router();

// Enforce authentication for all notification routes
router.use(authenticate);

// List notifications (paginated)
router.get('/', validate(notificationQuerySchema, 'query'), notificationController.getNotifications);

// Get unread notification count
router.get('/unread-count', notificationController.getUnreadCount);

// Mark all user notifications as read
router.patch('/read-all', notificationController.markAllAsRead);

// Mark single notification as read
router.patch('/:id/read', validate(notificationIdParamSchema, 'params'), notificationController.markAsRead);

// Delete single notification
router.delete('/:id', validate(notificationIdParamSchema, 'params'), notificationController.deleteNotification);

module.exports = router;
