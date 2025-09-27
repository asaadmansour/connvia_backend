// routes/notification.js
const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Get notifications for the authenticated user
router.get('/', authenticateToken, notificationController.getUserNotifications);

// Mark a notification as read
router.patch('/:notificationId/read', authenticateToken, notificationController.markNotificationAsRead);

// Mark all notifications as read
router.patch('/read-all', authenticateToken, notificationController.markAllNotificationsAsRead);

// Create a notification (for internal use by other controllers)
router.post('/', authenticateToken, notificationController.createReservationNotification);

module.exports = router;
