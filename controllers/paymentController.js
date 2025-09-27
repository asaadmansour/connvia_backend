const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { pool } = require("../config/db");

exports.createPaymentIntent = async (req, res) => {
  let connection;
  try {
    const { reservationId } = req.params;

    if (!reservationId) {
      return res.status(400).json({
        success: false,
        error: "Reservation ID is required",
      });
    }

    // Get a connection from the pool
    connection = await pool.getConnection();

    // Get reservation details
    const [reservation] = await connection.query(
      `SELECT r.*, v.name as venue_name, o.company_name as organizer_name 
       FROM venue_reservations r
       JOIN venue v ON r.venue_ID = v.venue_ID
       JOIN organizer o ON r.organizer_ID = o.organizer_ID
       WHERE r.reservation_ID = ?`,
      [reservationId]
    );

    if (!reservation || reservation.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Reservation not found",
      });
    }

    const reservationData = reservation[0];

    // Create a payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(reservationData.total_cost * 100), // Convert to cents
      currency: "egp",
      metadata: {
        reservationId: reservationId,
        venueName: reservationData.venue_name,
        organizerName: reservationData.organizer_name,
      },
    });

    // Update reservation with payment intent ID
    await connection.query(
      "UPDATE venue_reservations SET payment_intent_id = ? WHERE reservation_ID = ?",
      [paymentIntent.id, reservationId]
    );

    return res.status(200).json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      reservation: reservationData,
    });
  } catch (error) {
    console.error("Payment intent creation error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to create payment intent",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

exports.confirmPayment = async (req, res) => {
  let connection;
  try {
    const { reservationId } = req.params;
    const { paymentIntentId } = req.body;

    if (!reservationId || !paymentIntentId) {
      return res.status(400).json({
        success: false,
        error: "Reservation ID and Payment Intent ID are required",
      });
    }

    // Get a connection from the pool
    connection = await pool.getConnection();

    // Verify payment intent
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === "succeeded") {
      // Update reservation status
      await connection.query(
        'UPDATE venue_reservations SET payment_status = "paid" WHERE reservation_ID = ?',
        [reservationId]
      );

      return res.status(200).json({
        success: true,
        message: "Payment confirmed successfully",
      });
    } else {
      return res.status(400).json({
        success: false,
        error: "Payment not successful",
      });
    }
  } catch (error) {
    console.error("Payment confirmation error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to confirm payment",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// Create a Stripe Checkout Session for test mode
exports.createCheckoutSession = async (req, res) => {
  let connection;
  try {
    const { reservationId } = req.body;
    if (!reservationId) {
      return res
        .status(400)
        .json({ success: false, error: "Reservation ID is required" });
    }
    connection = await pool.getConnection();
    // Get reservation details
    const [reservation] = await connection.query(
      `SELECT r.*, v.name as venue_name, o.company_name as organizer_name 
       FROM venue_reservations r
       JOIN venue v ON r.venue_ID = v.venue_ID
       JOIN organizer o ON r.organizer_ID = o.organizer_ID
       WHERE r.reservation_ID = ?`,
      [reservationId]
    );
    if (!reservation || reservation.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Reservation not found" });
    }
    const reservationData = reservation[0];
    // Create a Stripe Checkout Session (test mode)
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "egp",
            product_data: {
              name: `Venue Reservation: ${reservationData.venue_name}`,
              description: `Organizer: ${reservationData.organizer_name}`,
            },
            unit_amount: Math.round(reservationData.total_cost * 100),
          },
          quantity: 1,
        },
      ],
      success_url: `${
        process.env.FRONTEND_URL || "http://localhost:5173"
      }/dashboards/organizer?payment=success&reservation=${reservationId}`,
      cancel_url: `${
        process.env.FRONTEND_URL || "http://localhost:5173"
      }/dashboards/organizer?payment=cancelled&reservation=${reservationId}`,
      metadata: { reservationId: reservationId },
    });
    return res.status(200).json({ success: true, url: session.url });
  } catch (error) {
    console.error("Checkout session creation error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to create checkout session" });
  } finally {
    if (connection) connection.release();
  }
};
