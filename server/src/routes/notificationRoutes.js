/**
 * Notification Routes
 *
 * Mounts endpoints for athlete email preferences, notification delivery audit log,
 * Resend inbound webhooks, and outbox recovery.
 *
 * @module routes/notificationRoutes
 */

const express = require('express');
const {
  getPreferences,
  updatePreferences,
  getNotificationHistory,
  handleResendWebhook,
  triggerOutboxProcess,
} = require('../controllers/notificationController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Public webhook receiver for Resend delivery notifications
router.post('/webhooks/resend', express.json(), handleResendWebhook);

// Protected athlete endpoints
router.use(protect);

router.get('/preferences', getPreferences);
router.patch('/preferences', updatePreferences);
router.get('/history', getNotificationHistory);

// Admin-only outbox processor
router.post('/outbox/process', authorize('ADMIN'), triggerOutboxProcess);

module.exports = router;
