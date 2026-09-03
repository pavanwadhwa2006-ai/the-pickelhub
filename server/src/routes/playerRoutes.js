/**
 * Player Routes
 *
 * Mounts endpoints for player directory, search autocomplete,
 * single player lookups, and personal profile updates.
 */

const express = require('express');
const {
  getPlayers,
  getPlayerById,
  getMyPlayerProfile,
  updateMyProfile,
  searchPlayers,
  getLeaderboardSpecialties,
  comparePlayers,
  getPlayerRatingHistory,
} = require('../controllers/playerController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Specific routes before parameterized routes
router.get('/search', searchPlayers);
router.get('/leaders', getLeaderboardSpecialties);
router.get('/compare', comparePlayers);
router.get('/me', protect, getMyPlayerProfile);
router.put('/me', protect, updateMyProfile);
router.get('/', getPlayers);
router.get('/:id/rating-history', getPlayerRatingHistory);
router.get('/:id', getPlayerById);

module.exports = router;
