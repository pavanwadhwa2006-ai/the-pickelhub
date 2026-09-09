/**
 * Booking Routes — The PickleHub Court Reservation Engine
 *
 * Mounts endpoints for court schedule queries, slot reservations,
 * and cancellation of bookings.
 *
 * @module routes/bookingRoutes
 */

const express = require('express');
const {
  getBookings,
  createBooking,
  cancelBooking,
  getMyBookings,
} = require('../controllers/bookingController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Public / Authenticated schedule lookup
router.get('/', getBookings);

// Protected athlete actions
router.get('/my', protect, getMyBookings);
router.post('/', protect, createBooking);
router.delete('/:id', protect, cancelBooking);

module.exports = router;
