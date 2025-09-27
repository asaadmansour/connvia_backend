// controllers/notificationController.js
const { pool } = require('../config/db');

/**
 * Get notifications for the authenticated user
 */
exports.getUserNotifications = async (req, res) => {
  let connection;
  try {
    // Get user info from the authenticated token
    const userId = req.user.userId;
    
    // Establish database connection
    connection = await pool.getConnection();
    
    // Get notifications for the user, ordered by creation date (newest first)
    const [notifications] = await connection.query(
      `SELECT * FROM notifications 
       WHERE user_ID = ? 
       ORDER BY created_at DESC 
       LIMIT 10`,
      [userId]
    );
    
    // Count unread notifications
    const [unreadCount] = await connection.query(
      `SELECT COUNT(*) as count 
       FROM notifications 
       WHERE user_ID = ? AND is_read = FALSE`,
      [userId]
    );
    
    return res.status(200).json({
      success: true,
      data: {
        notifications,
        unreadCount: unreadCount[0].count
      }
    });
  } catch (error) {
    console.error('Error fetching user notifications:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch notifications'
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

/**
 * Mark a notification as read
 */
exports.markNotificationAsRead = async (req, res) => {
  let connection;
  try {
    const { notificationId } = req.params;
    const userId = req.user.userId;
    
    if (!notificationId) {
      return res.status(400).json({
        success: false,
        error: 'Notification ID is required'
      });
    }
    
    // Establish database connection
    connection = await pool.getConnection();
    
    // Update the notification
    const [result] = await connection.query(
      `UPDATE notifications 
       SET is_read = TRUE 
       WHERE notification_ID = ? AND user_ID = ?`,
      [notificationId, userId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found or not owned by this user'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update notification'
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

/**
 * Mark all notifications as read for a user
 */
exports.markAllNotificationsAsRead = async (req, res) => {
  let connection;
  try {
    const userId = req.user.userId;
    
    // Establish database connection
    connection = await pool.getConnection();
    
    // Update all notifications for the user
    const [result] = await connection.query(
      `UPDATE notifications 
       SET is_read = TRUE 
       WHERE user_ID = ? AND is_read = FALSE`,
      [userId]
    );
    
    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
      count: result.affectedRows
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update notifications'
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

/**
 * Create a new notification
 * This function can be used internally by other controllers
 */
exports.createNotification = async (userId, message, notificationType, relatedId = null) => {
  let connection;
  try {
    // Establish database connection
    connection = await pool.getConnection();
    
    // Insert notification
    const [result] = await connection.query(
      `INSERT INTO notifications 
       (user_ID, message, notification_type, related_ID) 
       VALUES (?, ?, ?, ?)`,
      [userId, message, notificationType, relatedId]
    );
    
    return {
      success: true,
      notificationId: result.insertId
    };
  } catch (error) {
    console.error('Error creating notification:', error);
    return {
      success: false,
      error: 'Failed to create notification'
    };
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

/**
 * Create a notification for reservation status changes
 * This will be called when a reservation is created, confirmed, or cancelled
 */
exports.createReservationNotification = async (req, res) => {
  let connection;
  try {
    const { userId, message, notificationType, relatedId } = req.body;
    
    if (!userId || !message || !notificationType) {
      return res.status(400).json({
        success: false,
        error: 'User ID, message, and notification type are required'
      });
    }
    
    const result = await exports.createNotification(userId, message, notificationType, relatedId);
    
    if (!result.success) {
      return res.status(500).json(result);
    }
    
    return res.status(201).json({
      success: true,
      message: 'Notification created successfully',
      notificationId: result.notificationId
    });
  } catch (error) {
    console.error('Error creating reservation notification:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create notification'
    });
  }
};
