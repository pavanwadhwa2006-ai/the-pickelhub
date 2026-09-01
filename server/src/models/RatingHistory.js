/**
 * RatingHistory Model
 *
 * Mongoose model recording historical rating adjustments per PRD Section 10.4.
 * Tracks rating progression, category transitions, and match/tournament delta provenance.
 */

const mongoose = require('mongoose');

const ratingHistorySchema = new mongoose.Schema(
  {
    playerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      required: [true, 'Player reference is required'],
      index: true,
    },
    changeType: {
      type: String,
      enum: {
        values: ['MATCH', 'TOURNAMENT_BONUS', 'MANUAL_ADJUSTMENT'],
        message: '{VALUE} is not a valid rating change type',
      },
      required: [true, 'Change type is required'],
      index: true,
    },
    matchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Match',
      default: null,
      index: true,
    },
    ratingBefore: {
      type: Number,
      required: [true, 'Previous rating is required'],
    },
    ratingAfter: {
      type: Number,
      required: [true, 'New rating is required'],
    },
    delta: {
      type: Number,
      required: [true, 'Rating delta is required'],
    },
    categoryBefore: {
      type: String,
      required: [true, 'Previous category is required'],
    },
    categoryAfter: {
      type: String,
      required: [true, 'New category is required'],
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

ratingHistorySchema.index({ playerId: 1, createdAt: -1 });

const RatingHistory = mongoose.model('RatingHistory', ratingHistorySchema);

module.exports = RatingHistory;
