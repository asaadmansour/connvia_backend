const { pool } = require("../config/db");

/**
 * Get dashboard statistics for an organizer
 */
exports.getOrganizerDashboardStats = async (req, res) => {
  let connection;
  try {
    const userId = req.user.userId;
    console.log("Fetching dashboard stats for user ID:", userId);

    connection = await pool.getConnection();

    // Find the organizer_ID from the user_ID
    const [organizerRows] = await connection.query(
      "SELECT organizer_ID FROM organizer WHERE user_ID = ?",
      [userId]
    );

    if (organizerRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Organizer not found",
      });
    }

    const organizerId = organizerRows[0].organizer_ID;
    console.log("Organizer ID:", organizerId);

    // Get all events created by this organizer
    const [eventRows] = await connection.query(
      `SELECT event_ID 
       FROM event e
       LEFT JOIN venue_reservations vr ON e.reservation_ID = vr.reservation_ID
       WHERE vr.organizer_ID = ?`,
      [organizerId]
    );

    // Extract event IDs
    const eventIds = eventRows.map(event => event.event_ID);
    
    if (eventIds.length === 0) {
      // No events found, return zeros
      return res.status(200).json({
        success: true,
        data: {
          totalRevenue: 0,
          eventsCount: 0,
          ticketsSold: 0,
          pendingPayments: 0
        }
      });
    }

    // Use the event IDs to get statistics from attendee_reservations
    const [statsRows] = await connection.query(
      `SELECT 
        SUM(CASE WHEN payment_status = 'confirmed' THEN total_price ELSE 0 END) as totalRevenue,
        COUNT(DISTINCT event_ID) as eventsCount,
        SUM(CASE WHEN payment_status = 'confirmed' THEN quantity ELSE 0 END) as ticketsSold,
        COUNT(CASE WHEN payment_status = 'pending' THEN 1 ELSE NULL END) as pendingPayments
       FROM attendee_reservations
       WHERE event_ID IN (?)`,
      [eventIds]
    );

    // Get count of upcoming events
    const [upcomingEventsRows] = await connection.query(
      `SELECT COUNT(*) as upcomingCount
       FROM event e
       LEFT JOIN venue_reservations vr ON e.reservation_ID = vr.reservation_ID
       WHERE vr.organizer_ID = ? AND e.start_date >= CURDATE()`,
      [organizerId]
    );

    const stats = {
      totalRevenue: parseFloat(statsRows[0].totalRevenue || 0),
      eventsCount: eventRows.length,
      upcomingEvents: upcomingEventsRows[0].upcomingCount,
      ticketsSold: parseInt(statsRows[0].ticketsSold || 0),
      pendingPayments: parseInt(statsRows[0].pendingPayments || 0)
    };

    console.log("Dashboard stats:", stats);

    return res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return res.status(500).json({
      success: false,
      error: `Server error: ${error.message}`,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};
