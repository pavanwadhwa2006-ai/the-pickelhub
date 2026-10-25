/**
 * Notification Model — The PickleHub Persistent Outbox & Audit Trail
 *
 * Implements a durable transactional outbox for asynchronous email notifications.
 * Features:
 * - Stable, unique idempotency keys to strictly prevent duplicate notifications per business event.
 * - Outbox delivery state machine: PENDING -> SENT -> DELIVERED (or FAILED / CANCELLED / BOUNCED).
 * - Bounded retries with exponential backoff timestamp scheduling.
 * - Provider message tracking for Resend webhook reconciliation.
 *
 * @module models/Notification
 */

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipientUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    recipientPlayer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      default: null,
      index: true,
    },
    recipientEmail: {
      type: String,
      required: [true, 'Recipient email is required'],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email address format'],
    },
    channel: {
      type: String,
      enum: ['EMAIL'],
      default: 'EMAIL',
    },
    eventType: {
      type: String,
      enum: ['WELCOME', 'MATCH_RESULT', 'MATCH_REJECTED', 'LOGIN_ALERT', 'ACCOUNT_LOCKED', 'RATING_MILESTONE', 'SYSTEM'],
      required: [true, 'Event type is required'],
      index: true,
    },
    resourceType: {
      type: String,
      enum: ['User', 'Player', 'Match', 'Tournament', 'Booking', 'None'],
      default: 'None',
    },
    resourceId: {
      type: String,
      default: null,
      index: true,
    },
    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    subject: {
      type: String,
      required: [true, 'Subject line is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'SENT', 'DELIVERED', 'FAILED', 'CANCELLED', 'BOUNCED'],
      default: 'PENDING',
      index: true,
    },
    provider: {
      type: String,
      default: 'resend',
    },
    providerMessageId: {
      type: String,
      default: null,
      index: true,
      sparse: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      default: 3,
    },
    nextRetryAt: {
      type: Date,
      default: null,
      index: true,
    },
    lastAttemptAt: {
      type: Date,
      default: null,
    },
    sentAt: {
      type: Date,
      default: null,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
    failedAt: {
      type: Date,
      default: null,
    },
    error: {
      code: { type: String, default: null },
      message: { type: String, default: null },
      timestamp: { type: Date, default: null },
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound index for durable outbox retry recovery
notificationSchema.index({ status: 1, nextRetryAt: 1, attempts: 1 });

// User notification history index
notificationSchema.index({ recipientUser: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
