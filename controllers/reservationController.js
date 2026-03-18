const { pool } = require("../config/db");
const { authenticateToken } = require("../middleware/authMiddleware");

/**
 * Create a new venue reservation
 */
exports.createReservation = async (req, res) => {
  let connection;
  try {
    /* log removed */
    /* log removed */
    /* log removed */
    /* log removed */
    /* log removed */
    /* log removed */
    /* log removed */
    /* log removed */

    // Extract data from request body with fallbacks for field name variations
    const venueId =
      req.body.venueId ||
      req.body.venue_id ||
      req.body.venue_ID ||
      req.body.venue ||
      null;
    const subcategoryId =
      req.body.subcategoryId ||
      req.body.subcategory_id ||
      req.body.subcategory_ID ||
      req.body.subcategory ||
      null;
    const startDate =
      req.body.startDate ||
      req.body.start_date ||
      req.body.reservation_date ||
      null;
    const endDate = req.body.endDate || req.body.end_date || null;
    const startTime = req.body.startTime || req.body.start_time || null;
    const endTime = req.body.endTime || req.body.end_time || null;
    const attendeesCount =
      req.body.attendeesCount ||
      req.body.attendees_count ||
      req.body.attendees ||
      1;
    const pricingOption =
      req.body.pricingOption ||
      req.body.pricing_option ||
      req.body.pricing ||
      "hourly";
    const totalCost =
      req.body.totalCost || req.body.total_cost || req.body.cost || 0;

    // Check for required fields
    if (
      !venueId ||
      !startDate ||
      !startTime ||
      !endTime ||
      !attendeesCount ||
      !pricingOption ||
      !totalCost
    ) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields for reservation",
      });
    }

    // Get user ID from authenticated user token
    if (!req.user || !req.user.userId) {
      /* log removed */
      return res.status(401).json({
        success: false,
        error: "Authentication failed. Please log in again.",
      });
    }

    const userId = req.user.userId;

    // Get a connection from the pool
    connection = await pool.getConnection();

    // Start transaction
    await connection.beginTransaction();

    // Find the organizer_ID from the organizer table based on the user_ID
    const [organizerRows] = await connection.query(
      "SELECT organizer_ID FROM organizer WHERE user_ID = ?",
      [userId]
    );

    if (!organizerRows || organizerRows.length === 0) {
      await connection.rollback();
      /* log removed */
      return res.status(400).json({
        success: false,
        error: "User is not registered as an organizer",
      });
    }

    const organizerId = organizerRows[0].organizer_ID;
    /* log removed */

    // Create a new reservation in the database
    const query = `
      INSERT INTO venue_reservations 
      (organizer_ID, venue_ID, subcategory_id, reservation_date, end_date, start_time, end_time, 
       attendees_count, pricing_option, total_cost, payment_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `;

    // Insert one reservation record with both start and end dates
    const [result] = await connection.query(query, [
      organizerId,
      venueId,
      subcategoryId || null,
      startDate,
      endDate,
      startTime,
      endTime,
      attendeesCount,
      pricingOption,
      totalCost,
    ]);

    // Commit transaction
    await connection.commit();

    return res.status(201).json({
      success: true,
      message: "Reservation created successfully",
      data: {
        reservationId: result.insertId,
        totalCost: totalCost,
      },
    });
  } catch (error) {
    // Rollback transaction in case of error
    if (connection) {
      await connection.rollback();
    }

    /* log removed */
    /* log removed */
    /* log removed */

    // Additional SQL-specific error details if available
    if (error.code) /* log removed */
    if (error.sqlState) /* log removed */
    if (error.sql) /* log removed */

    /* log removed */
    /* log removed */
    /* log removed */

    return res.status(500).json({
      success: false,
      error: `Server error: ${error.message}`,
      details:
        process.env.NODE_ENV === "development"
          ? {
              code: error.code,
              sqlMessage: error.sqlMessage,
              sqlState: error.sqlState,
            }
          : undefined,
    });
  } finally {
    // Release connection back to pool
    if (connection) {
      connection.release();
    }
  }
};

/**
 * Get reservations for a venue
 */
exports.getVenueReservations = async (req, res) => {
  try {
    const { venueId } = req.params;

    if (!venueId) {
      return res.status(400).json({
        success: false,
        error: "Venue ID is required",
      });
    }

    const query = `
      SELECT r.reservation_ID, r.organizer_ID, r.venue_ID, r.subcategory_id, 
             r.reservation_date, r.start_time, r.end_time, r.attendees_count,
             r.pricing_option, r.total_cost, r.payment_status, r.created_at,
             u.name as organizer_name, v.name as venue_name,
             s.name as subcategory_name, c.name as category_name
      FROM venue_reservations r
      JOIN user u ON r.organizer_ID = u.user_ID
      JOIN venue v ON r.venue_ID = v.venue_ID
      LEFT JOIN subcategories s ON r.subcategory_id = s.subcategory_id
      LEFT JOIN category c ON s.category_id = c.category_ID
      WHERE r.venue_ID = ?
      ORDER BY r.reservation_date DESC, r.start_time ASC
    `;

    const [results] = await pool.query(query, [venueId]);

    return res.status(200).json({
      success: true,
      data: {
        reservations: results,
      },
    });
  } catch (error) {
    /* log removed */
    return res.status(500).json({
      success: false,
      error: "Server error occurred while fetching reservations",
    });
  }
};

/**
 * Get reservations for an organizer
 */
exports.getOrganizerReservations = async (req, res) => {
  let connection;
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        success: false,
        error: "Authentication failed. Please log in again.",
      });
    }

    const userId = req.user.userId;
    /* log removed */

    // Get a connection from the pool
    connection = await pool.getConnection();

    // First find the organizer_ID from user_ID
    const [organizerRows] = await connection.query(
      "SELECT organizer_ID FROM organizer WHERE user_ID = ?",
      [userId]
    );

    if (!organizerRows || organizerRows.length === 0) {
      /* log removed */
      return res.status(200).json({
        success: true,
        data: {
          reservations: [],
          message: "User is not registered as an organizer",
        },
      });
    }

    const organizerId = organizerRows[0].organizer_ID;
    /* log removed */

    // Now query reservations with the correct organizer_ID
    const query = `
      SELECT r.reservation_ID, r.organizer_ID, r.venue_ID, r.subcategory_id, 
             r.reservation_date, r.start_time, r.end_time, r.attendees_count,
             r.pricing_option, r.total_cost, r.payment_status, r.created_at,
             v.name as venue_name, v.images,
             s.name as subcategory_name, c.name as category_name
      FROM venue_reservations r
      JOIN venue v ON r.venue_ID = v.venue_ID
      LEFT JOIN subcategories s ON r.subcategory_id = s.subcategory_id
      LEFT JOIN category c ON s.category_id = c.category_ID
      WHERE r.organizer_ID = ?
      ORDER BY r.reservation_date DESC, r.start_time ASC
    `;

    /* log removed */

    const [results] = await pool.query(query, [organizerId]);

    /* log removed */

    return res.status(200).json({
      success: true,
      data: {
        reservations: results,
      },
    });
  } catch (error) {
    /* log removed */
    return res.status(500).json({
      success: false,
      error: "Server error occurred while fetching reservations",
      details: error.message,
    });
  } finally {
    // Release connection back to pool
    if (connection) {
      connection.release();
    }
  }
};

/**
 * Get reservations for a venue owner
 */
exports.getVenueOwnerReservations = async (req, res) => {
  let connection;
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        success: false,
        error: "Authentication failed. Please log in again.",
      });
    }

    const userId = req.user.userId;
    /* log removed */

    // Get a connection from the pool
    connection = await pool.getConnection();

    // First find the venue_owner_ID from user_ID
    const [venueOwnerRows] = await connection.query(
      "SELECT venue_owner_ID FROM venue_owner WHERE user_ID = ?",
      [userId]
    );

    if (!venueOwnerRows || venueOwnerRows.length === 0) {
      /* log removed */
      return res.status(200).json({
        success: true,
        data: {
          reservations: [],
          message: "User is not registered as a venue owner",
        },
      });
    }

    const venueOwnerId = venueOwnerRows[0].venue_owner_ID;
    /* log removed */

    // Get all venues owned by this venue owner
    const [venuesResult] = await connection.query(
      "SELECT venue_ID FROM venue WHERE venue_owner_ID = ?",
      [venueOwnerId]
    );

    if (!venuesResult || venuesResult.length === 0) {
      /* log removed */
      return res.status(200).json({
        success: true,
        data: {
          reservations: [],
          message: "No venues found for this venue owner",
        },
      });
    }

    // Extract venue IDs
    const venueIds = venuesResult.map((venue) => venue.venue_ID);
    /* log removed */

    // Create placeholders for SQL query
    const placeholders = venueIds.map(() => "?").join(",");

    // Query reservations with the venue IDs
    const query = `
      SELECT r.reservation_ID, r.organizer_ID, r.venue_ID, r.subcategory_id, 
             r.reservation_date as start_date, r.end_date, r.start_time, r.end_time, r.attendees_count,
             r.pricing_option, r.total_cost, r.payment_status, r.created_at,
             v.name as venue_name,
             o.company_name as organizer_company, u.name as organizer_name, u.email as organizer_email,
             s.name as subcategory_name, c.name as category_name
      FROM venue_reservations r
      JOIN venue v ON r.venue_ID = v.venue_ID
      JOIN organizer o ON r.organizer_ID = o.organizer_ID
      JOIN user u ON o.user_ID = u.user_ID
      LEFT JOIN subcategories s ON r.subcategory_id = s.subcategory_id
      LEFT JOIN category c ON s.category_id = c.category_ID
      WHERE r.venue_ID IN (${placeholders})
      ORDER BY r.reservation_date DESC, r.start_time ASC
    `;

    /* log removed */

    const [results] = await connection.query(query, venueIds);

    /* log removed */

    return res.status(200).json({
      success: true,
      data: {
        reservations: results,
      },
    });
  } catch (error) {
    /* log removed */
    return res.status(500).json({
      success: false,
      error: "Server error occurred while fetching reservations",
      details: error.message,
    });
  } finally {
    // Release connection back to pool
    if (connection) {
      connection.release();
    }
  }
};

/**
 * Update reservation payment status
 */
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { reservationId } = req.params;
    const { paymentStatus } = req.body;

    if (!reservationId || !paymentStatus) {
      return res.status(400).json({
        success: false,
        error: "Reservation ID and payment status are required",
      });
    }

    // Validate payment status
    if (!["pending", "paid", "cancelled"].includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        error:
          'Invalid payment status. Must be either "pending", "paid", or "cancelled"',
      });
    }

    const query = `
      UPDATE venue_reservations
      SET payment_status = ?
      WHERE reservation_ID = ?
    `;

    await pool.query(query, [paymentStatus, reservationId]);

    return res.status(200).json({
      success: true,
      message: "Payment status updated successfully",
    });
  } catch (error) {
    /* log removed */
    return res.status(500).json({
      success: false,
      error: "Server error occurred while updating payment status",
    });
  }
};
