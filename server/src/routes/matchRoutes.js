/**
 * Match Routes
 *
 * Mounts endpoints for match score submission, pending matches queries,
 * match history, and individual match inspections.
 */

const express = require('express');
const {
  submitMatch,
  getPendingMatchesForPlayer,
  getPlayerMatchHistory,
  getMatchById,
} = require('../controllers/matchController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// All match submission and retrieval routes require authentication
router.use(protect);

router.post('/submit', submitMatch);
router.get('/pending', getPendingMatchesForPlayer);
router.get('/my-history', getPlayerMatchHistory);
router.get('/:id', getMatchById);

module.exports = router;
