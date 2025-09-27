// create_notifications_table.js
const { pool } = require('./config/db');

async function createNotificationsTable() {
  let connection;
  try {
    connection = await pool.getConnection();
    console.log('Creating notifications table...');
    
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS notifications (
        notification_ID INT AUTO_INCREMENT PRIMARY KEY,
        user_ID INT NOT NULL,
        message VARCHAR(255) NOT NULL,
        related_ID INT,
        notification_type VARCHAR(50) NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_ID) REFERENCES `user`(user_ID) ON DELETE CASCADE
      )
    `;
    
    await connection.query(createTableQuery);
    console.log('Notifications table created successfully!');
  } catch (error) {
    console.error('Error creating notifications table:', error);
  } finally {
    if (connection) {
      connection.release();
    }
    process.exit(0);
  }
}

createNotificationsTable();
