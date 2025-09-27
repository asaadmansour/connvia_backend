const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/authMiddleware");
const paymentController = require("../controllers/paymentController");

// Create payment intent for a reservation
router.post(
  "/reservation/:reservationId/create-intent",
  authenticateToken,
  paymentController.createPaymentIntent
);

// Confirm payment for a reservation
router.post(
  "/reservation/:reservationId/confirm",
  authenticateToken,
  paymentController.confirmPayment
);

// Create Stripe Checkout Session for a reservation (test mode, no auth)
router.post(
  "/reservation/create-checkout-session",
  paymentController.createCheckoutSession
);

module.exports = router;
