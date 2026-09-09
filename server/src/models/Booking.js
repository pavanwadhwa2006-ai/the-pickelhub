/**
 * Booking Model — The PickleHub Court Reservation Engine
 *
 * Implements court booking for Court 1 and Court 2 across hourly slots.
 * Features a compound unique index on { court, date, slot, status: 'CONFIRMED' }
 * to atomically prevent double-booking collisions under concurrent traffic.
 *
 * @module models/Booking
 */

const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    bookingId: {
      type: String,
      unique: true,
      index: true,
    },
    court: {
      type: String,
      required: [true, 'Court identifier is required.'],
      enum: {
        values: ['Court 1', 'Court 2'],
        message: '{VALUE} is not a valid court.',
      },
      trim: true,
    },
    date: {
      type: String, // 'YYYY-MM-DD' formatted date string for clean indexing & timezone independence
      required: [true, 'Booking date is required.'],
      index: true,
    },
    slot: {
      type: String, // '06:00', '10:00', '22:00', etc.
      required: [true, 'Booking time slot is required.'],
    },
    timeLabel: {
      type: String, // '10:00 PM - 11:00 PM'
      required: [true, 'Time label is required.'],
    },
    bookedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      required: [true, 'Booking must be associated with an athlete player profile.'],
      index: true,
    },
    bookedByUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Booking must be associated with a user account.'],
      index: true,
    },
    status: {
      type: String,
      enum: ['CONFIRMED', 'CANCELLED'],
      default: 'CONFIRMED',
      index: true,
    },
    notes: {
      type: String,
      maxlength: [200, 'Notes cannot exceed 200 characters.'],
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to guarantee no double bookings for the same court and time slot
bookingSchema.index(
  { court: 1, date: 1, slot: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'CONFIRMED' },
  }
);

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
