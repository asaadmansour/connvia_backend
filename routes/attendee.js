const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const attendeeController = require('../controllers/attendeeController');

// Create a new attendee reservation
router.post('/reservations', authenticateToken, attendeeController.createAttendeeReservation);

// Update attendee reservation payment status
router.patch('/reservations/:reservationId/payment', authenticateToken, attendeeController.updateReservationPaymentStatus);

// Get attendee reservations
router.get('/reservations', authenticateToken, attendeeController.getAttendeeReservations);

// Get attendee tickets
router.get('/tickets', authenticateToken, attendeeController.getAttendeeTickets);

module.exports = router;
