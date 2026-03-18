const { pool } = require("../config/db");

async function cleanupPendingReservations() {
  let connection;
  try {
    connection = await pool.getConnection();

    // Delete reservations that are pending for more than 10 minutes
    const query = `
      DELETE FROM venue_reservations 
      WHERE payment_status = 'pending' 
      AND created_at < NOW() - INTERVAL 10 MINUTE
    `;

    const [result] = await connection.query(query);

    if (result.affectedRows > 0) {
      /* log removed */
    }
  } catch (error) {
    /* log removed */
  } finally {
    if (connection) connection.release();
  }
}

// Export the cleanup function
module.exports = cleanupPendingReservations;
