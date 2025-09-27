const express = require("express");
const router = express.Router();
const { createCheckoutSession, handleWebhook } = require("../controllers/stripeController");
const { authenticateToken } = require("../middleware/authMiddleware");

// Create checkout session - protected by authentication
router.post("/create-checkout-session", authenticateToken, createCheckoutSession);

// Stripe webhook endpoint - NOT protected by authentication (Stripe needs direct access)
router.post("/webhook", express.raw({type: 'application/json'}), handleWebhook);

module.exports = router;
