// routes/reservation.js
const express = require('express');
const router = express.Router();
const reservationController = require('../controllers/reservationController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Create a new reservation (requires authentication)
router.post('/', authenticateToken, reservationController.createReservation);

// Get reservations for a venue
router.get('/venue/:venueId', authenticateToken, reservationController.getVenueReservations);

// Get reservations for the authenticated organizer
router.get('/organizer', authenticateToken, reservationController.getOrganizerReservations);

// Get reservations for the authenticated venue owner
router.get('/venue-owner', authenticateToken, reservationController.getVenueOwnerReservations);

// Update reservation payment status
router.patch('/:reservationId/payment', authenticateToken, reservationController.updatePaymentStatus);

module.exports = router;
