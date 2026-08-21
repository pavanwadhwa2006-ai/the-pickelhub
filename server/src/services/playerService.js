/**
 * Player Service
 *
 * Handles atomic Player ID generation, dynamic category calculations,
 * and player profile creation with lazy-repair fallback.
 */

const Counter = require('../models/Counter');
const Player = require('../models/Player');

/**
 * Calculate dynamic skill category from Elo rating (PRD Section 8.1)
 * @param {number} rating
 * @returns {string} - 'Beginner' | 'Intermediate' | 'Advanced Intermediate' | 'Pro'
 */
const calculateCategory = (rating) => {
  const r = typeof rating === 'number' ? rating : 1000;
  if (r < 1000) return 'Beginner';
  if (r < 1200) return 'Intermediate';
  if (r < 1400) return 'Advanced Intermediate';
  return 'Pro';
};

/**
 * Generate unique atomic Player ID (format: PH-00001)
 * @returns {Promise<string>}
 */
const generatePlayerId = async () => {
  const seq = await Counter.getNextSequence('playerId');
  return `PH-${String(seq).padStart(5, '0')}`;
};

/**
 * Create a new Player profile document
 * @param {object} params - { userId, email, name, profilePhoto }
 * @returns {Promise<Player>}
 */
const createPlayerProfile = async ({ userId, email, name, profilePhoto }) => {
  const playerId = await generatePlayerId();
  const initialRating = 1000;
  const initialCategory = calculateCategory(initialRating);

  const fallbackName = name && name.trim().length > 0
    ? name.trim()
    : email.split('@')[0];

  const player = await Player.create({
    userId,
    playerId,
    name: fallbackName,
    email: email.toLowerCase().trim(),
    profilePhoto: profilePhoto || '',
    currentRating: initialRating,
    highestRating: initialRating,
    category: initialCategory,
    matchesPlayed: 0,
    wins: 0,
    losses: 0,
    winningStreak: 0,
    tournamentWins: 0,
    tournamentAppearances: 0,
    accountStatus: 'ACTIVE',
  });

  return player;
};

/**
 * Lazy-repair helper: Retrieves player profile or auto-creates if missing
 * @param {object} user - User document
 * @returns {Promise<Player>}
 */
const getOrCreatePlayerProfile = async (user) => {
  let player = await Player.findOne({ userId: user._id });

  if (!player) {
    player = await createPlayerProfile({
      userId: user._id,
      email: user.email,
      name: user.email.split('@')[0],
    });
  }

  return player;
};

module.exports = {
  calculateCategory,
  generatePlayerId,
  createPlayerProfile,
  getOrCreatePlayerProfile,
};
