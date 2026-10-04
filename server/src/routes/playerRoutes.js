/**
 * Player Routes
 *
 * Mounts endpoints for player directory, search autocomplete,
 * single player lookups, tier progression, and personal profile updates.
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
  getTierProgress,
  getTierDefinitions,
} = require('../controllers/playerController');
const { protect } = require('../middleware/authMiddleware');
const { responseCache } = require('../middleware/responseCache');

const router = express.Router();

// Specific routes before parameterized routes
router.get('/search', searchPlayers);
router.get('/leaders', responseCache(60), getLeaderboardSpecialties);
router.get('/compare', comparePlayers);
router.get('/tiers', getTierDefinitions);
router.get('/me', protect, getMyPlayerProfile);
router.put('/me', protect, updateMyProfile);
router.get('/', responseCache(30), getPlayers);
router.get('/:id/rating-history', getPlayerRatingHistory);
router.get('/:id/tier-progress', getTierProgress);
router.get('/:id', getPlayerById);

module.exports = router;

