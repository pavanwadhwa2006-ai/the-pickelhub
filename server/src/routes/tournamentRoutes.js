/**
 * Tournament Routes (Public & Player-Facing)
 *
 * Mounts tournament discovery, detail retrieval, atomic registration, and status-gated withdrawal.
 */

const express = require('express');
const {
  getTournaments,
  getTournamentById,
  registerForTournament,
  withdrawFromTournament,
} = require('../controllers/tournamentController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Public routes
router.get('/', getTournaments);
router.get('/:id', getTournamentById);

// Player registration routes (protected)
router.post('/:id/register', protect, registerForTournament);
router.delete('/:id/register', protect, withdrawFromTournament);

module.exports = router;
