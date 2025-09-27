// routes/venue.js
const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/authMiddleware");
const venueController = require("../controllers/venueController");
const reservationController = require("../controllers/reservationController");
const multer = require("multer");
const path = require("path");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../public/uploads/venues"));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "images-" + uniqueSuffix + path.extname(file.originalname));
  },
});

// Initialize multer upload
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max file size
  fileFilter: function (req, file, cb) {
    // Accept images only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
      return cb(new Error("Only image files are allowed!"), false);
    }
    cb(null, true);
  },
});

// Create uploads directory if it doesn't exist
const fs = require("fs");
const uploadDir = path.join(__dirname, "../public/uploads/venues");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Create a new venue - protect this route with authenticateToken
router.post(
  "/",
  authenticateToken,
  upload.fields([{ name: "images", maxCount: 10 }]),
  venueController.createVenue
);

// Get all venues for the current user
router.get("/", authenticateToken, venueController.getUserVenues);

// Get dashboard statistics for venue owner
router.get("/dashboard/stats", authenticateToken, venueController.getVenueOwnerDashboardStats);

// Get detailed venue information
router.get("/details/:id", authenticateToken, venueController.getVenueDetails);

// Main routes
router.get("/available", authenticateToken, venueController.getAvailableVenues);
// router.post("/search", authenticateToken, venueController.searchVenues); // Commented out as the function is not defined
router.post(
  "/search-by-owner-name",
  authenticateToken,
  venueController.searchVenueOwnerByName
);

// Owner routes
router.get("/owner/:id", authenticateToken, venueController.getVenueOwnerById);

// Venue ID specific routes (must come before the generic /:id route)
router.get(
  "/:id/owner-id",
  authenticateToken,
  venueController.getVenueOwnerIdByVenueId
);
router.put(
  "/:id",
  authenticateToken,
  upload.fields([{ name: "images", maxCount: 10 }]),
  venueController.updateVenue
);
router.delete("/:id", authenticateToken, venueController.deleteVenue);

// Reserve a venue (mark it as unavailable)
router.post(
  "/:venueId/reserve",
  authenticateToken,
  venueController.reserveVenue
);

// Reservation routes
router.post(
  "/reservations",
  authenticateToken,
  reservationController.createReservation
);
router.get(
  "/reservations/organizer",
  authenticateToken,
  reservationController.getOrganizerReservations
);
router.get(
  "/reservations/venue/:venueId",
  authenticateToken,
  reservationController.getVenueReservations
);
router.patch(
  "/reservations/:reservationId/payment",
  authenticateToken,
  reservationController.updatePaymentStatus
);

// Get a single venue by ID (this must be last since it's a catch-all for /:id)
router.get("/:id", authenticateToken, venueController.getVenueById);

module.exports = router;
