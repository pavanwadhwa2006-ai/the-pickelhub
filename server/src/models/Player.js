/**
 * Player Model
 *
 * Implements Player schema (PRD Section 10.2) linked to User,
 * with unique Player ID (PH-XXXXX), default starting rating 1000,
 * and computed winPercentage virtual.
 */

const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    playerId: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Player name is required'],
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    profilePhoto: {
      type: String,
      default: '',
    },
    currentRating: {
      type: Number,
      default: 1000,
      index: true,
    },
    highestRating: {
      type: Number,
      default: 1000,
    },
    category: {
      type: String,
      default: 'Intermediate',
    },
    matchesPlayed: {
      type: Number,
      default: 0,
    },
    wins: {
      type: Number,
      default: 0,
    },
    losses: {
      type: Number,
      default: 0,
    },
    winningStreak: {
      type: Number,
      default: 0,
    },
    tournamentWins: {
      type: Number,
      default: 0,
    },
    tournamentAppearances: {
      type: Number,
      default: 0,
    },
    accountStatus: {
      type: String,
      enum: {
        values: ['ACTIVE', 'SUSPENDED'],
        message: '{VALUE} is not a valid account status',
      },
      default: 'ACTIVE',
    },
    lastCategoryNotificationAt: {
      type: Date,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
    },
  }
);

// Virtual for win percentage (derivable, eliminates staleness)
playerSchema.virtual('winPercentage').get(function () {
  if (!this.matchesPlayed || this.matchesPlayed === 0) {
    return 0;
  }
  return Math.round((this.wins / this.matchesPlayed) * 100);
});

const Player = mongoose.model('Player', playerSchema);

module.exports = Player;
