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
      default: 'Beginner',
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
    winPercentage: {
      type: Number,
      default: 0,
      index: true,
      get: function () {
        if (!this.matchesPlayed || this.matchesPlayed === 0) {
          return 0;
        }
        return Math.round((this.wins / this.matchesPlayed) * 100);
      },
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
      getters: true,
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      getters: true,
    },
  }
);

// Pre-save hook: automatically compute winPercentage so it is indexed & queryable in MongoDB
playerSchema.pre('save', function (next) {
  if (this.matchesPlayed && this.matchesPlayed > 0) {
    this.winPercentage = Math.round((this.wins / this.matchesPlayed) * 100);
  } else {
    this.winPercentage = 0;
  }
  next();
});

const Player = mongoose.model('Player', playerSchema);

module.exports = Player;
