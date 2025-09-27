const express = require("express");
const router = express.Router();
const stripeController = require("../controllers/stripeController");

// Create checkout session
router.post("/create-checkout-session", stripeController.createCheckoutSession);

// Check payment status
router.get(
  "/check-payment-status/:reservationId",
  stripeController.checkPaymentStatus
);

// Update payment status
router.post("/update-payment-status", stripeController.updatePaymentStatus);

// Stripe webhook
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  stripeController.handleWebhook
);

module.exports = router;
