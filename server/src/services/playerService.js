/**
 * Player Service
 *
 * Handles atomic Player ID generation, dynamic category calculations
 * with dual-gate unlock system (Elo + Matches Played), and player
 * profile creation with lazy-repair fallback.
 */

const Counter = require('../models/Counter');
const Player = require('../models/Player');

// ──────────────────────────────────────────────
// Tier Definitions — Central Source of Truth
// ──────────────────────────────────────────────

/**
 * Ordered tier definitions. Each tier requires BOTH:
 *   1. Minimum Elo rating threshold
 *   2. Minimum number of match wins (player must push to WIN matches)
 *   3. Minimum matches played
 *
 * Players must "push themselves" — you can't simply have a high
 * rating from one match; you must earn match victories to unlock
 * higher divisions.
 */
const TIER_DEFINITIONS = [
  { key: 'beginner',              name: 'Beginner',              minElo: 0,    minWins: 0,  minMatches: 0,  icon: '🏓', color: '#B9AE7E', description: 'Starting Rank (Baseline 1000 Elo)' },
  { key: 'intermediate',          name: 'Intermediate',          minElo: 1100, minWins: 3,  minMatches: 5,  icon: '🔥', color: '#D3968C', description: 'Requires 1100+ Elo & 3 Match Victories' },
  { key: 'advanced_intermediate', name: 'Advanced Intermediate', minElo: 1300, minWins: 10, minMatches: 15, icon: '⚔️', color: '#839958', description: 'Requires 1300+ Elo & 10 Match Victories' },
  { key: 'pro',                   name: 'Pro',                   minElo: 1500, minWins: 25, minMatches: 30, icon: '🏆', color: '#10586B', description: 'Requires 1500+ Elo & 25 Match Victories' },
  { key: 'god_level',             name: 'God Level',             minElo: 1800, minWins: 50, minMatches: 50, icon: '⚡', color: '#FFD700', description: 'Pinnacle Echelon: 1800+ Elo & 50 Victories' },
];

/**
 * Calculate dynamic skill category from Elo rating AND match wins.
 * Dual-gate system: player must meet BOTH the Elo threshold AND the
 * minimum wins requirement to qualify for a tier.
 *
 * @param {number} rating                  - Current Elo rating
 * @param {number|object} [winsOrStats]   - Total match wins, or options object { wins, matchesPlayed }
 * @param {number} [matchesPlayed]        - Total matches played (optional)
 * @returns {string} Category name
 */
const calculateCategory = (rating, winsOrStats = undefined, matchesPlayed = undefined) => {
  const r = typeof rating === 'number' ? rating : 1000;
  let w = winsOrStats;
  let m = matchesPlayed;

  if (typeof winsOrStats === 'object' && winsOrStats !== null) {
    w = winsOrStats.wins;
    m = winsOrStats.matchesPlayed;
  }

  // Walk backwards from highest tier to find the best qualifying tier
  for (let i = TIER_DEFINITIONS.length - 1; i >= 0; i--) {
    const tier = TIER_DEFINITIONS[i];
    const eloMet = r >= tier.minElo;
    const winsMet = w === undefined || (typeof w === 'number' && w >= tier.minWins);
    const matchesMet = m === undefined || (typeof m === 'number' && m >= (tier.minMatches || 0));

    if (eloMet && winsMet && matchesMet) {
      return tier.name;
    }
  }
  return 'Beginner';
};

/**
 * Get detailed unlock progress for all tiers.
 * Used by the frontend to render a gamified tier roadmap with
 * locked/unlocked states, progress indicators, and milestone tracking.
 *
 * @param {number} rating         - Current Elo rating
 * @param {number} wins           - Total match wins
 * @param {number} matchesPlayed  - Total matches played
 * @returns {object} { currentTier, totalWins, totalMatches, rating, nextTier, tiers }
 */
const getTierUnlockProgress = (rating, wins = 0, matchesPlayed = 0) => {
  const r = typeof rating === 'number' ? rating : 1000;
  const w = typeof wins === 'number' ? wins : 0;
  const m = typeof matchesPlayed === 'number' ? matchesPlayed : 0;
  const currentCategory = calculateCategory(r, w, m);

  const tiers = TIER_DEFINITIONS.map((tier, index) => {
    const eloMet = r >= tier.minElo;
    const winsMet = w >= tier.minWins;
    const matchesMet = m >= (tier.minMatches || 0);
    const unlocked = eloMet && winsMet && matchesMet;

    // Progress percentages for each gate
    const eloProgress = tier.minElo === 0 ? 100 : Math.min(100, Math.round((r / tier.minElo) * 100));
    const winsProgress = tier.minWins === 0 ? 100 : Math.min(100, Math.round((w / tier.minWins) * 100));
    const matchesProgress = (tier.minMatches || 0) === 0 ? 100 : Math.min(100, Math.round((m / (tier.minMatches || 1)) * 100));

    // Remaining to unlock
    const eloRemaining = Math.max(0, tier.minElo - r);
    const winsRemaining = Math.max(0, tier.minWins - w);
    const matchesRemaining = Math.max(0, (tier.minMatches || 0) - m);

    // Is this the player's current active tier?
    const isCurrent = tier.name === currentCategory;

    // Is this the next tier to unlock?
    const isNext = !unlocked && (index === 0 || calculateCategory(r, w, m) === TIER_DEFINITIONS[index - 1]?.name);

    return {
      ...tier,
      index,
      unlocked,
      isCurrent,
      isNext,
      eloMet,
      winsMet,
      matchesMet,
      eloProgress,
      winsProgress,
      matchesProgress,
      eloRemaining,
      winsRemaining,
      matchesRemaining,
    };
  });

  const nextTier = tiers.find((t) => !t.unlocked) || null;

  return {
    currentTier: currentCategory,
    totalWins: w,
    totalMatches: m,
    rating: r,
    nextTier,
    tiers,
  };
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
  const initialCategory = calculateCategory(initialRating, 0);

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
  TIER_DEFINITIONS,
  calculateCategory,
  getTierUnlockProgress,
  generatePlayerId,
  createPlayerProfile,
  getOrCreatePlayerProfile,
};
