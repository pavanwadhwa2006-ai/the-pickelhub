/**
 * Tournament Model
 *
 * Mongoose schema for sanctioned club competitions per PRD Section 9.1.
 * Supports singles, doubles, mixed doubles, and open tournaments with
 * seeded brackets and configurable rating bonus payouts.
 */

const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema(
  {
    player: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      required: [true, 'Player reference is required for registration'],
    },
    partner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      default: null,
    },
    seed: {
      type: Number,
      default: null,
    },
    seedRating: {
      type: Number,
      default: 1000,
    },
    registeredAt: {
      type: Date,
      default: Date.now,
    },
    appliedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User submitting the application is required'],
    },
  },
  { _id: true }
);

const bracketMatchSchema = new mongoose.Schema(
  {
    matchId: {
      type: String,
      required: true,
    },
    round: {
      type: Number,
      required: true,
    },
    matchIndex: {
      type: Number,
      required: true,
    },
    player1: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      default: null,
    },
    player2: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      default: null,
    },
    partner1: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      default: null,
    },
    partner2: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      default: null,
    },
    score1: {
      type: Number,
      default: null,
    },
    score2: {
      type: Number,
      default: null,
    },
    winner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      default: null,
    },
    status: {
      type: String,
      enum: ['PENDING', 'READY', 'IN_PROGRESS', 'COMPLETED', 'BYE'],
      default: 'PENDING',
    },
  },
  { _id: true }
);

const tournamentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Tournament name is required'],
      trim: true,
      maxlength: [100, 'Tournament name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    tournamentType: {
      type: String,
      enum: {
        values: ['SINGLES', 'DOUBLES', 'MIXED_DOUBLES', 'OPEN'],
        message: '{VALUE} is not a valid tournament format',
      },
      default: 'SINGLES',
    },
    category: {
      type: String,
      enum: {
        values: ['All', 'Beginner', 'Intermediate', 'Advanced Intermediate', 'Pro'],
        message: '{VALUE} is not a valid skill category division',
      },
      default: 'All',
    },
    status: {
      type: String,
      enum: {
        values: [
          'DRAFT',
          'REGISTRATION_OPEN',
          'REGISTRATION_CLOSED',
          'IN_PROGRESS',
          'COMPLETED',
          'CANCELLED',
        ],
        message: '{VALUE} is not a valid tournament status',
      },
      default: 'REGISTRATION_OPEN',
      index: true,
    },
    startDate: {
      type: Date,
      required: [true, 'Tournament start date is required'],
    },
    registrationDeadline: {
      type: Date,
      required: [true, 'Registration deadline is required'],
    },
    maxParticipants: {
      type: Number,
      default: 16,
      min: [4, 'Tournament must allow at least 4 participants'],
      max: [64, 'Tournament cannot exceed 64 participants'],
    },
    seedingType: {
      type: String,
      enum: ['RATING_BASED', 'RANDOM', 'MANUAL'],
      default: 'RATING_BASED',
    },
    bonusConfig: {
      winnerBonus: {
        type: Number,
        default: 50,
        min: [0, 'Bonus cannot be negative'],
      },
      runnerUpBonus: {
        type: Number,
        default: 25,
        min: [0, 'Bonus cannot be negative'],
      },
      semiFinalistBonus: {
        type: Number,
        default: 10,
        min: [0, 'Bonus cannot be negative'],
      },
    },
    participants: [participantSchema],
    bracket: [bracketMatchSchema],
    winner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      default: null,
    },
    runnerUp: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      default: null,
    },
    semiFinalists: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Player',
      },
    ],
    bonusesAwarded: {
      type: Boolean,
      default: false,
      index: true,
    },
    bonusesAwardedAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Tournament creator is required'],
    },
  },
  {
    timestamps: true,
  }
);

// Helpful virtual for current participant count
tournamentSchema.virtual('participantCount').get(function () {
  return this.participants ? this.participants.length : 0;
});

const Tournament = mongoose.model('Tournament', tournamentSchema);

module.exports = Tournament;
