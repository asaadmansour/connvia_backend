const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/authMiddleware");
const { uploadEventImage } = require("../middleware/uploadMiddleware");
const eventController = require("../controllers/eventController");

// Create a new event with image upload handling
router.post("/", authenticateToken, uploadEventImage, eventController.createEvent);

// Get events for the authenticated organizer
router.get("/organizer", authenticateToken, eventController.getOrganizerEvents);

// Get all events for attendees
router.get("/all", eventController.getAllEvents);

// Get all categories and subcategories
router.get("/categories", eventController.getCategories);

module.exports = router;
