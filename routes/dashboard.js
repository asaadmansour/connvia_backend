// routes/dashboard.js
const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/authMiddleware");
const venueController = require("../controllers/venueController");
const dashboardController = require("../controllers/dashboardController");

// Get dashboard statistics for venue owner
router.get("/venue-owner-stats", authenticateToken, venueController.getVenueOwnerDashboardStats);

// Get dashboard statistics for organizer
router.get("/organizer-stats", authenticateToken, dashboardController.getOrganizerDashboardStats);

module.exports = router;
