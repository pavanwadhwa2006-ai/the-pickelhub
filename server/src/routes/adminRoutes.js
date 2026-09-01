/**
 * Admin Routes
 *
 * Mounts administrative endpoints for match queue approvals, rejections,
 * direct official entry, and governance audit trails.
 */

const express = require('express');
const {
  getPendingMatches,
  approveMatch,
  rejectMatch,
  createDirectMatch,
  getAuditLogs,
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Enforce authentication and ADMIN role on all administrative routes
router.use(protect, authorize('ADMIN'));

router.get('/matches/pending', getPendingMatches);
router.post('/matches/:id/approve', approveMatch);
router.post('/matches/:id/reject', rejectMatch);
router.post('/matches/direct', createDirectMatch);
router.get('/audit-logs', getAuditLogs);

module.exports = router;
