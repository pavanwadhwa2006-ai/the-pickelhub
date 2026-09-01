/**
 * AuditLog Model
 *
 * Mongoose model recording administrative governance actions per PRD Section 10.6.
 * Tracks match approvals, rejections, direct match creations, and manual rating adjustments.
 */

const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: {
        values: [
          'MATCH_APPROVE',
          'MATCH_REJECT',
          'DIRECT_MATCH_CREATE',
          'MANUAL_RATING_ADJUST',
          'USER_ROLE_PROMOTE',
          'TOURNAMENT_CREATE',
          'TOURNAMENT_UPDATE',
          'TOURNAMENT_BONUS_AWARD',
          'TOURNAMENT_CANCEL',
        ],
        message: '{VALUE} is not a valid audit action type',
      },
      required: [true, 'Audit action type is required'],
      index: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User executing the action is required'],
      index: true,
    },
    targetType: {
      type: String,
      required: [true, 'Target resource type is required'],
      default: 'Match',
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Target resource identifier is required'],
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
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

auditLogSchema.index({ performedBy: 1, createdAt: -1 });
auditLogSchema.index({ targetId: 1, createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;
