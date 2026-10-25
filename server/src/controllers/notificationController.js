/**
 * Notification Controller — The PickleHub Notification & Webhook Engine
 *
 * Implements:
 * 1. User notification preference inspection and updates (opt-in / opt-out).
 * 2. Scoped athlete notification history retrieval.
 * 3. Inbound Resend delivery webhook reconciliation (delivery status updates).
 * 4. Durable outbox retry triggering.
 *
 * @module controllers/notificationController
 */

const crypto = require('crypto');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { processOutboxRetries } = require('../services/emailService');
const { RESEND_WEBHOOK_SECRET } = require('../config/env');

/**
 * @desc    Get authenticated user's notification preferences
 * @route   GET /api/notifications/preferences
 * @access  Private
 */
const getPreferences = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('notificationPreferences email');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    res.status(200).json({
      success: true,
      data: {
        email: user.email,
        preferences: user.notificationPreferences || {
          emailMatchResults: true,
          emailLoginAlerts: true,
          emailAnnouncements: true,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update authenticated user's notification preferences
 * @route   PATCH /api/notifications/preferences
 * @access  Private
 */
const updatePreferences = async (req, res, next) => {
  try {
    const { emailMatchResults, emailAnnouncements, emailLoginAlerts } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (!user.notificationPreferences) {
      user.notificationPreferences = {};
    }

    if (typeof emailMatchResults === 'boolean') {
      user.notificationPreferences.emailMatchResults = emailMatchResults;
    }

    if (typeof emailAnnouncements === 'boolean') {
      user.notificationPreferences.emailAnnouncements = emailAnnouncements;
    }

    if (typeof emailLoginAlerts === 'boolean') {
      user.notificationPreferences.emailLoginAlerts = emailLoginAlerts;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Notification preferences updated successfully.',
      data: {
        preferences: user.notificationPreferences,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get authenticated user's notification history (strictly scoped)
 * @route   GET /api/notifications/history
 * @access  Private
 */
const getNotificationHistory = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(Math.max(1, parseInt(limit, 10) || 20), 50);
    const skip = (pageNum - 1) * limitNum;

    // Strict security: query ONLY current user's notifications
    const query = { recipientUser: req.user._id };

    const [notifications, total] = await Promise.all([
      Notification.find(query)
        .select('recipientEmail eventType resourceType resourceId subject status sentAt deliveredAt createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Notification.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      count: notifications.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      data: notifications,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Handle inbound Resend webhook delivery events
 * @route   POST /api/notifications/webhooks/resend
 * @access  Public (Webhook verified via secret/signature)
 */
const handleResendWebhook = async (req, res, next) => {
  try {
    // 1. Optional Webhook Secret / Signature Verification
    if (RESEND_WEBHOOK_SECRET) {
      const signature = req.headers['svix-signature'] || req.headers['x-resend-signature'];
      const timestamp = req.headers['svix-timestamp'] || req.headers['x-resend-timestamp'];

      if (!signature) {
        return res.status(401).json({ success: false, message: 'Missing webhook signature header.' });
      }

      // Verify HMAC-SHA256 signature if svix headers are present
      if (timestamp && req.rawBody) {
        const payloadToSign = `${timestamp}.${req.rawBody}`;
        const secretBytes = RESEND_WEBHOOK_SECRET.startsWith('whsec_')
          ? Buffer.from(RESEND_WEBHOOK_SECRET.slice(6), 'base64')
          : Buffer.from(RESEND_WEBHOOK_SECRET, 'utf8');

        const expectedSig = crypto
          .createHmac('sha256', secretBytes)
          .update(payloadToSign)
          .digest('base64');

        const sigParts = signature.split(' ');
        const matches = sigParts.some((part) => {
          const sig = part.startsWith('v1,') ? part.slice(3) : part;
          return sig === expectedSig;
        });

        if (!matches && process.env.NODE_ENV === 'production') {
          return res.status(401).json({ success: false, message: 'Invalid webhook signature.' });
        }
      }
    }

    const { type, data } = req.body;
    if (!type || !data) {
      return res.status(400).json({ success: false, message: 'Invalid webhook payload structure.' });
    }

    // Provider email ID can be in data.email_id or data.id
    const providerMessageId = data.email_id || data.id;
    if (!providerMessageId) {
      return res.status(200).json({ received: true, note: 'No message ID in event' });
    }

    const notification = await Notification.findOne({ providerMessageId });
    if (!notification) {
      // Message may belong to another environment or predate outbox tracking
      return res.status(200).json({ received: true, note: 'Notification record not found' });
    }

    // Reconcile delivery status transitions
    switch (type) {
      case 'email.delivered':
        notification.status = 'DELIVERED';
        notification.deliveredAt = new Date();
        break;
      case 'email.bounced':
        notification.status = 'BOUNCED';
        notification.failedAt = new Date();
        notification.error = {
          code: 'BOUNCED',
          message: data.reason || 'Email bounced by recipient mail server',
          timestamp: new Date(),
        };
        break;
      case 'email.complained':
        notification.status = 'BOUNCED';
        notification.error = {
          code: 'SPAM_COMPLAINT',
          message: 'Recipient marked email as spam',
          timestamp: new Date(),
        };
        break;
      default:
        // Ignore unhandled event types (e.g. email.sent, email.opened)
        break;
    }

    await notification.save();

    res.status(200).json({ received: true, status: notification.status });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Trigger outbox retries for pending/failed jobs
 * @route   POST /api/notifications/outbox/process
 * @access  Private (Admin or Internal)
 */
const triggerOutboxProcess = async (req, res, next) => {
  try {
    const { limit = 20 } = req.body || {};
    const result = await processOutboxRetries({ limit: parseInt(limit, 10) || 20 });

    res.status(200).json({
      success: true,
      message: `Processed ${result.processed} outbox jobs (${result.succeeded} succeeded, ${result.failed} failed).`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPreferences,
  updatePreferences,
  getNotificationHistory,
  handleResendWebhook,
  triggerOutboxProcess,
};
