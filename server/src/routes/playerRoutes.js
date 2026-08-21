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
} = require('../controllers/playerController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Specific routes before parameterized routes
router.get('/search', searchPlayers);
router.get('/me', protect, getMyPlayerProfile);
router.put('/me', protect, updateMyProfile);
router.get('/', getPlayers);
router.get('/:id', getPlayerById);

module.exports = router;
