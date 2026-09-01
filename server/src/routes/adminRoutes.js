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
  promoteUser,
} = require('../controllers/adminController');
const {
  createTournament,
  updateTournament,
  closeRegistration,
  generateBracket,
  recordMatchScore,
  awardBonuses,
  getRatingHistory,
} = require('../controllers/tournamentController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Enforce authentication and ADMIN role on all administrative routes
router.use(protect, authorize('ADMIN'));

// Match approval queue & governance
router.get('/matches/pending', getPendingMatches);
router.post('/matches/:id/approve', approveMatch);
router.post('/matches/:id/reject', rejectMatch);
router.post('/matches/direct', createDirectMatch);
router.get('/audit-logs', getAuditLogs);
router.post('/users/:id/promote', promoteUser);

// Tournament Competition Management (Milestone 8)
router.post('/tournaments', createTournament);
router.put('/tournaments/:id', updateTournament);
router.post('/tournaments/:id/close-registration', closeRegistration);
router.post('/tournaments/:id/generate-bracket', generateBracket);
router.post('/tournaments/:id/matches/score', recordMatchScore);
router.post('/tournaments/:id/award-bonuses', awardBonuses);

// Rating History Audit Table (Master Plan Part A3 & Item 9)
router.get('/rating-history', getRatingHistory);

module.exports = router;
