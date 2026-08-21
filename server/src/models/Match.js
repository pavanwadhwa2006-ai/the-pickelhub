/**
 * Match Model
 *
 * Mongoose model representing official singles and doubles matches per PRD Section 10.3.
 * Supports PENDING_APPROVAL, APPROVED, and REJECTED status, score arrays,
 * and immutable rating history hooks.
 */

const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema(
  {
    matchId: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    court: {
      type: String,
      required: [true, 'Court identifier is required'],
      trim: true,
    },
    matchType: {
      type: String,
      enum: {
        values: ['SINGLES', 'DOUBLES'],
        message: '{VALUE} is not a supported match type',
      },
      required: [true, 'Match type is required'],
    },
    isTournament: {
      type: Boolean,
      default: false,
    },
    tournamentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tournament',
      default: null,
    },
    teamA: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Player',
        required: true,
      },
    ],
    teamB: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Player',
        required: true,
      },
    ],
    scores: [
      {
        teamAScore: {
          type: Number,
          required: true,
          min: [0, 'Score cannot be negative'],
        },
        teamBScore: {
          type: Number,
          required: true,
          min: [0, 'Score cannot be negative'],
        },
      },
    ],
    winnerTeam: {
      type: String,
      enum: {
        values: ['A', 'B'],
        message: 'winnerTeam must be either A or B',
      },
      required: [true, 'Winner team is required'],
    },
    status: {
      type: String,
      enum: {
        values: ['PENDING_APPROVAL', 'APPROVED', 'REJECTED'],
        message: '{VALUE} is not a valid match status',
      },
      default: 'PENDING_APPROVAL',
      index: true,
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      required: [true, 'Submitter player profile is required'],
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      default: null,
      trim: true,
    },
    ratingChanges: [
      {
        playerId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Player',
        },
        oldRating: {
          type: Number,
        },
        newRating: {
          type: Number,
        },
        delta: {
          type: Number,
        },
      },
    ],
    recordedByAdmin: {
      type: Boolean,
      default: false,
    },
    correction: {
      correctedFromMatchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Match',
        default: null,
      },
      isSuperseded: {
        type: Boolean,
        default: false,
      },
      supersededAt: {
        type: Date,
        default: null,
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for fast lookups
matchSchema.index({ 'teamA': 1, status: 1 });
matchSchema.index({ 'teamB': 1, status: 1 });
matchSchema.index({ submittedBy: 1, status: 1 });
matchSchema.index({ createdAt: -1 });

const Match = mongoose.model('Match', matchSchema);

module.exports = Match;
