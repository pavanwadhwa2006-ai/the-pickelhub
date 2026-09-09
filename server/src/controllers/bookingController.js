/**
 * Booking Controller — The PickleHub Court Reservation Engine
 *
 * Implements slot discovery, court bookings for Court 1 & Court 2,
 * real-time broadcast of newly reserved and cancelled slots,
 * and double-booking race condition prevention.
 *
 * @module controllers/bookingController
 */

const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Counter = require('../models/Counter');
const { getOrCreatePlayerProfile } = require('../services/playerService');
const { broadcast, CHANNELS, EVENTS } = require('../services/realtimeService');

// Club Court Definitions
const COURTS = ['Court 1', 'Court 2'];

// Club Operating Hours: 6:00 AM to 11:00 PM (1-hour slots)
const OPERATING_SLOTS = [
  { slot: '06:00', timeLabel: '6:00 AM - 7:00 AM' },
  { slot: '07:00', timeLabel: '7:00 AM - 8:00 AM' },
  { slot: '08:00', timeLabel: '8:00 AM - 9:00 AM' },
  { slot: '09:00', timeLabel: '9:00 AM - 10:00 AM' },
  { slot: '10:00', timeLabel: '10:00 AM - 11:00 AM' },
  { slot: '11:00', timeLabel: '11:00 AM - 12:00 PM' },
  { slot: '12:00', timeLabel: '12:00 PM - 1:00 PM' },
  { slot: '13:00', timeLabel: '1:00 PM - 2:00 PM' },
  { slot: '14:00', timeLabel: '2:00 PM - 3:00 PM' },
  { slot: '15:00', timeLabel: '3:00 PM - 4:00 PM' },
  { slot: '16:00', timeLabel: '4:00 PM - 5:00 PM' },
  { slot: '17:00', timeLabel: '5:00 PM - 6:00 PM' },
  { slot: '18:00', timeLabel: '6:00 PM - 7:00 PM' },
  { slot: '19:00', timeLabel: '7:00 PM - 8:00 PM' },
  { slot: '20:00', timeLabel: '8:00 PM - 9:00 PM' },
  { slot: '21:00', timeLabel: '9:00 PM - 10:00 PM' },
  { slot: '22:00', timeLabel: '10:00 PM - 11:00 PM' },
];

/**
 * Helper to get today's date in YYYY-MM-DD
 */
const getTodayDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * @desc    Get court schedule and slot availability for a specific date
 * @route   GET /api/bookings?date=YYYY-MM-DD
 * @access  Public / Authenticated
 */
const getBookings = async (req, res, next) => {
  try {
    const dateQuery = req.query.date || getTodayDateString();

    // Fetch all confirmed bookings for the target date
    const existingBookings = await Booking.find({
      date: dateQuery,
      status: 'CONFIRMED',
    })
      .populate('bookedBy', 'playerId name currentRating category profilePhoto')
      .lean();

    // Index existing bookings by `${court}_${slot}`
    const bookingMap = new Map();
    existingBookings.forEach((b) => {
      bookingMap.set(`${b.court}_${b.slot}`, b);
    });

    const currentUserId = req.user?._id?.toString();

    // Build complete court schedule matrix
    const schedule = {};
    COURTS.forEach((court) => {
      schedule[court] = OPERATING_SLOTS.map((slotDef) => {
        const key = `${court}_${slotDef.slot}`;
        const booking = bookingMap.get(key);

        if (booking) {
          const isMyBooking = currentUserId && booking.bookedByUser?.toString() === currentUserId;
          return {
            slot: slotDef.slot,
            timeLabel: slotDef.timeLabel,
            isBooked: true,
            bookingId: booking.bookingId,
            id: booking._id,
            bookedBy: {
              name: booking.bookedBy?.name || 'Club Member',
              playerId: booking.bookedBy?.playerId || 'PH-MEMBER',
              profilePhoto: booking.bookedBy?.profilePhoto || null,
              category: booking.bookedBy?.category || 'Intermediate',
              currentRating: booking.bookedBy?.currentRating || 1000,
            },
            isMyBooking: Boolean(isMyBooking),
            createdAt: booking.createdAt,
          };
        }

        return {
          slot: slotDef.slot,
          timeLabel: slotDef.timeLabel,
          isBooked: false,
          bookingId: null,
          bookedBy: null,
          isMyBooking: false,
        };
      });
    });

    res.status(200).json({
      success: true,
      data: {
        date: dateQuery,
        courts: COURTS,
        schedule,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Book a court slot (Court 1 or Court 2)
 * @route   POST /api/bookings
 * @access  Private (Authenticated Athletes)
 */
const createBooking = async (req, res, next) => {
  try {
    const { court, date, slot, notes } = req.body;

    // 1. Validation
    if (!court || !COURTS.includes(court)) {
      return res.status(400).json({
        success: false,
        message: 'Court must be either "Court 1" or "Court 2".',
      });
    }

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        success: false,
        message: 'Date is required in YYYY-MM-DD format.',
      });
    }

    const slotDef = OPERATING_SLOTS.find((s) => s.slot === slot);
    if (!slotDef) {
      return res.status(400).json({
        success: false,
        message: `Invalid slot "${slot}". Operating hours are 6:00 AM to 11:00 PM.`,
      });
    }

    // 2. Prevent past bookings
    const today = getTodayDateString();
    if (date < today) {
      return res.status(400).json({
        success: false,
        message: 'Cannot book court slots in the past.',
      });
    }

    // 3. Resolve booking player profile
    const player = await getOrCreatePlayerProfile(req.user);

    // 4. Check slot availability
    const existing = await Booking.findOne({
      court,
      date,
      slot,
      status: 'CONFIRMED',
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: `This slot on ${court} is already booked by another athlete.`,
      });
    }

    // 5. Generate sequential booking ID (BK-XXXXX)
    let seq = 1;
    try {
      seq = await Counter.getNextSequence('bookingId');
    } catch {
      seq = Math.floor(1000 + Math.random() * 9000);
    }
    const bookingId = `BK-${String(seq).padStart(5, '0')}`;

    // 6. Create booking
    const newBooking = await Booking.create({
      bookingId,
      court,
      date,
      slot,
      timeLabel: slotDef.timeLabel,
      bookedBy: player._id,
      bookedByUser: req.user._id,
      status: 'CONFIRMED',
      notes: typeof notes === 'string' ? notes.trim() : '',
    });

    const populated = await Booking.findById(newBooking._id)
      .populate('bookedBy', 'playerId name currentRating category profilePhoto');

    // 7. Real-time broadcast to all connected clients
    broadcast(CHANNELS.GLOBAL, 'booking-created', {
      bookingId,
      court,
      date,
      slot,
      timeLabel: slotDef.timeLabel,
      bookedBy: {
        name: player.name,
        playerId: player.playerId,
        profilePhoto: player.profilePhoto,
        currentRating: player.currentRating,
      },
    });

    res.status(201).json({
      success: true,
      message: `Successfully booked ${court} for ${slotDef.timeLabel} on ${date}!`,
      data: populated,
    });
  } catch (error) {
    // Catch unique index collisions under race condition
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'This slot was just reserved by another athlete.',
      });
    }
    next(error);
  }
};

/**
 * @desc    Cancel an existing booking
 * @route   DELETE /api/bookings/:id
 * @access  Private (Booker or Admin)
 */
const cancelBooking = async (req, res, next) => {
  try {
    const { id } = req.params;

    let booking;
    if (mongoose.Types.ObjectId.isValid(id)) {
      booking = await Booking.findById(id);
    } else {
      booking = await Booking.findOne({ bookingId: id });
    }

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.',
      });
    }

    if (booking.status === 'CANCELLED') {
      return res.status(400).json({
        success: false,
        message: 'This booking is already cancelled.',
      });
    }

    // Auth check: only the booker or an ADMIN can cancel
    const isOwner = booking.bookedByUser.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to cancel this reservation.',
      });
    }

    booking.status = 'CANCELLED';
    await booking.save();

    // Broadcast cancellation to all connected clients
    broadcast(CHANNELS.GLOBAL, 'booking-cancelled', {
      bookingId: booking.bookingId,
      court: booking.court,
      date: booking.date,
      slot: booking.slot,
    });

    res.status(200).json({
      success: true,
      message: `Reservation for ${booking.court} (${booking.timeLabel}) has been cancelled.`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current athlete's upcoming confirmed court bookings
 * @route   GET /api/bookings/my
 * @access  Private (Authenticated Athletes)
 */
const getMyBookings = async (req, res, next) => {
  try {
    const player = await getOrCreatePlayerProfile(req.user);
    const today = getTodayDateString();

    const bookings = await Booking.find({
      bookedBy: player._id,
      date: { $gte: today },
      status: 'CONFIRMED',
    })
      .sort({ date: 1, slot: 1 })
      .limit(10);

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getBookings,
  createBooking,
  cancelBooking,
  getMyBookings,
  COURTS,
  OPERATING_SLOTS,
};
