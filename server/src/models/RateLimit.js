/**
 * RateLimit Model
 *
 * Mongoose model implementing atomic, persistent rate-limiting counters
 * for stateless serverless environments (Vercel) using MongoDB TTL indexing.
 */

const mongoose = require('mongoose');

const rateLimitSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    count: {
      type: Number,
      default: 1,
      min: 1,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 }, // Auto-delete document upon expiration
    },
  },
  {
    timestamps: true,
  }
);

const RateLimit = mongoose.model('RateLimit', rateLimitSchema);

module.exports = RateLimit;
