const pool = require("../config/db");
const { verifyToken } = require("../middleware/authMiddleware");

// Create a new attendee reservation
const createAttendeeReservation = async (req, res) => {
  let connection;
  try {
    const { eventId, quantity, totalPrice } = req.body;
    const userId = req.user.userId; // From the auth middleware - using userId from JWT

    console.log("Creating reservation with:", {
      userId,
      eventId,
      quantity,
      totalPrice,
    });

    if (!eventId || !quantity || !totalPrice) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    connection = await pool.getConnection();

    // Get the attendee_ID from the user_ID
    const [attendeeRows] = await connection.query(
      "SELECT attendee_ID FROM attendee WHERE user_ID = ?",
      [userId]
    );

    // If no attendee record exists, create one
    let attendeeId;
    if (attendeeRows.length === 0) {
      console.log("Creating new attendee record for user:", userId);
      // User doesn't have an attendee record yet, create one
      const [newAttendee] = await connection.query(
        "INSERT INTO attendee (user_ID, created_at) VALUES (?, NOW())",
        [userId]
      );
      attendeeId = newAttendee.insertId;
    } else {
      attendeeId = attendeeRows[0].attendee_ID;
    }

    console.log("Using attendeeId:", attendeeId);

    // Create a new reservation with pending payment status
    const [result] = await connection.query(
      `INSERT INTO attendee_reservations 
      (attendee_ID, event_ID, quantity, total_price, payment_status, created_at) 
      VALUES (?, ?, ?, ?, 'pending', NOW())`,
      [attendeeId, eventId, quantity, totalPrice]
    );

    const reservationId = result.insertId;

    res.status(201).json({
      success: true,
      message: "Reservation created successfully",
      data: {
        reservationId,
        eventId,
        quantity,
        totalPrice,
        paymentStatus: "pending",
      },
    });
  } catch (error) {
    // Enhanced error logging
    console.error("Error creating attendee reservation:", error);
    console.error("Create reservation error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      userId: req.user.id,
      eventId: req.body.eventId,
      quantity: req.body.quantity,
    });

    res.status(500).json({
      success: false,
      message: "Failed to create reservation",
      error: error.message,
    });
  } finally {
    if (connection) connection.release();
  }
};

// Update attendee reservation payment status
const updateReservationPaymentStatus = async (req, res) => {
  let connection;
  try {
    const { reservationId } = req.params;
    let { paymentStatus } = req.body;
    const userId = req.user.userId; // From the auth middleware - using userId from JWT

    if (!reservationId || !paymentStatus) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    // Normalize payment status at the beginning to avoid multiple updates
    // If 'successful' is passed, convert it to 'confirmed' to match the database enum
    if (paymentStatus === "successful") {
      paymentStatus = "confirmed";
    }

    connection = await pool.getConnection();

    // Get the attendee_ID from the user_ID
    const [attendeeRows] = await connection.query(
      "SELECT attendee_ID FROM attendee WHERE user_ID = ?",
      [userId]
    );

    if (attendeeRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Attendee record not found for this user",
      });
    }

    const attendeeId = attendeeRows[0].attendee_ID;

    // Update the payment status - only once with the normalized status
    const [result] = await connection.query(
      `UPDATE attendee_reservations 
      SET payment_status = ? 
      WHERE reservation_ID = ? AND attendee_ID = ?`,
      [paymentStatus, reservationId, attendeeId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Reservation not found or not owned by this user",
      });
    }

    // Log the payment status update
    console.log(
      `Payment for reservation ${reservationId} marked as ${paymentStatus}`
    );

    // Get the reservation details for logging
    const [reservationRows] = await connection.query(
      `SELECT event_ID, quantity FROM attendee_reservations WHERE reservation_ID = ?`,
      [reservationId]
    );

    if (reservationRows.length > 0) {
      const { event_ID, quantity } = reservationRows[0];
      console.log(
        `Updated reservation for event ${event_ID} with quantity ${quantity}`
      );

      // Generate tickets if payment status is confirmed
      if (paymentStatus === "confirmed") {
        try {
          // CRITICAL: Use a database lock to ensure only one process can generate tickets
          // Start a transaction
          await connection.beginTransaction();

          try {
            // First, check if tickets already exist for this reservation
            // Use FOR UPDATE to lock the row during the transaction
            const [existingTickets] = await connection.query(
              `SELECT COUNT(*) as ticketCount FROM tickets WHERE reservation_ID = ? FOR UPDATE`,
              [reservationId]
            );

            const ticketCount = existingTickets[0].ticketCount;

            // Double-check to make absolutely sure we're not generating duplicate tickets
            // Only generate tickets if none exist for this reservation
            if (ticketCount === 0) {
              console.log(
                `No existing tickets found for reservation ${reservationId}. Generating ${quantity} tickets...`
              );

              // Get event details for QR code content
              const [eventRows] = await connection.query(
                `SELECT e.name, e.start_date, e.end_date, e.start_time, e.end_time, e.reservation_ID, vr.venue_ID 
               FROM event e 
               LEFT JOIN venue_reservations vr ON e.reservation_ID = vr.reservation_ID 
               WHERE e.event_ID = ?`,
                [event_ID]
              );

              if (eventRows.length > 0) {
                const eventDetails = eventRows[0];

                // Create tickets based on quantity
                for (let i = 0; i < quantity; i++) {
                  // Generate unique ticket data for QR code
                  const ticketData = {
                    reservationId: reservationId,
                    eventId: event_ID,
                    eventName: eventDetails.name,
                    eventStartDate: eventDetails.start_date,
                    eventEndDate: eventDetails.end_date,
                    eventStartTime: eventDetails.start_time,
                    eventEndTime: eventDetails.end_time,
                    ticketNumber: i + 1,
                    attendeeId: attendeeId,
                    timestamp: new Date().toISOString(),
                  };

                  // Convert ticket data to JSON string for QR code
                  const qrCodeContent = JSON.stringify(ticketData);

                  // Insert ticket into tickets table
                  await connection.query(
                    `INSERT INTO tickets (reservation_ID, qr_code, created_at) VALUES (?, ?, NOW())`,
                    [reservationId, qrCodeContent]
                  );
                }

                console.log(
                  `Generated ${quantity} tickets for reservation ${reservationId}`
                );
              }

              // If we get here without errors, commit the transaction
              await connection.commit();
              console.log(
                `Transaction committed successfully for reservation ${reservationId}`
              );
            } else {
              // No need for the transaction if we're not generating tickets
              await connection.rollback();
              console.log(
                `Tickets already exist for reservation ${reservationId}. Found ${ticketCount} tickets, skipping generation.`
              );
            }
          } catch (transactionError) {
            // If there's an error during ticket generation, rollback the transaction
            await connection.rollback();
            console.error(
              `Transaction error during ticket generation: ${transactionError.message}`
            );
            throw transactionError; // Re-throw to be caught by the outer try-catch
          }
        } catch (error) {
          console.error("Error generating tickets:", error);
          // Continue with the response even if ticket generation fails
          // We don't want to fail the payment status update if ticket generation fails
        }
      }
    }

    res.status(200).json({
      success: true,
      message: "Reservation payment status updated successfully",
      data: {
        reservationId,
        paymentStatus,
      },
    });
  } catch (error) {
    // Enhanced error logging
    console.error("Error updating attendee reservation payment status:", error);
    console.error("Update payment status error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      userId: req.user.id,
      reservationId: req.params.reservationId,
      paymentStatus: req.body.paymentStatus,
    });

    res.status(500).json({
      success: false,
      message: "Failed to update reservation payment status",
      error: error.message,
    });
  } finally {
    if (connection) connection.release();
  }
};

// Get attendee reservations
const getAttendeeReservations = async (req, res) => {
  let connection;
  try {
    const userId = req.user.userId; // From the auth middleware - using userId from JWT

    connection = await pool.getConnection();

    // Get the attendee_ID from the user_ID
    const [attendeeRows] = await connection.query(
      "SELECT attendee_ID FROM attendee WHERE user_ID = ?",
      [userId]
    );

    if (attendeeRows.length === 0) {
      // No attendee record yet, return empty array
      return res.status(200).json({
        success: true,
        data: [],
      });
    }

    const attendeeId = attendeeRows[0].attendee_ID;

    // Get all reservations for the attendee
    const [reservations] = await connection.query(
      `SELECT ar.*, e.name as event_title, e.start_date as event_date, e.start_time as event_time 
      FROM attendee_reservations ar
      JOIN event e ON ar.event_ID = e.event_ID
      WHERE ar.attendee_ID = ?
      ORDER BY ar.created_at DESC`,
      [attendeeId]
    );

    res.status(200).json({
      success: true,
      data: reservations,
    });
  } catch (error) {
    // Enhanced error logging
    console.error("Error getting attendee reservations:", error);
    console.error("Get reservations error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      userId: req.user.id,
    });

    res.status(500).json({
      success: false,
      message: "Failed to get reservations",
      error: error.message,
    });
  } finally {
    if (connection) connection.release();
  }
};

// Get attendee tickets
const getAttendeeTickets = async (req, res) => {
  let connection;
  try {
    const userId = req.user.userId; // From the auth middleware

    connection = await pool.getConnection();

    // Get the attendee_ID from the user_ID
    const [attendeeRows] = await connection.query(
      "SELECT attendee_ID FROM attendee WHERE user_ID = ?",
      [userId]
    );

    if (attendeeRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Attendee record not found for this user",
      });
    }

    const attendeeId = attendeeRows[0].attendee_ID;

    // Get all tickets for the attendee's reservations
    const [tickets] = await connection.query(
      `SELECT t.ticket_ID, t.reservation_ID, t.qr_code, t.created_at, 
              e.name as event_name, e.start_date as event_date, 
              v.name as venue_name
       FROM tickets t
       JOIN attendee_reservations ar ON t.reservation_ID = ar.reservation_ID
       JOIN event e ON ar.event_ID = e.event_ID
       LEFT JOIN venue_reservations vr ON e.reservation_ID = vr.reservation_ID
       LEFT JOIN venue v ON vr.venue_ID = v.venue_ID
       WHERE ar.attendee_ID = ? AND ar.payment_status = 'confirmed'
       ORDER BY t.created_at DESC`,
      [attendeeId]
    );

    res.status(200).json({
      success: true,
      data: tickets,
      count: tickets.length,
    });
  } catch (error) {
    console.error("Error fetching attendee tickets:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch tickets",
      error: error.message,
    });
  } finally {
    if (connection) connection.release();
  }
};

module.exports = {
  createAttendeeReservation,
  updateReservationPaymentStatus,
  getAttendeeReservations,
  getAttendeeTickets,
};
