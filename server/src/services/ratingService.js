/**
 * Rating Service — The PickleHub Elo Engine
 *
 * Centralizes ALL Elo rating logic in a single backend service (Rule E).
 * No Elo formulas may exist in the frontend or any other service.
 *
 * Implements:
 *   - Expected Score calculation (PRD Section 7.1)
 *   - Rating Update with configurable K-factor (PRD Section 7.1)
 *   - Singles match rating changes
 *   - Doubles match rating changes with individually-weighted
 *     delta distribution (PRD Section 7.2, full spec — not MVP fallback)
 *
 * @module services/ratingService
 */

const env = require('../config/env');

// ──────────────────────────────────────────────
// Core Elo Primitives
// ──────────────────────────────────────────────

/**
 * Calculate the expected score for player A against player B.
 *
 * Formula (PRD Section 7.1):
 *   E_A = 1 / (1 + 10^((R_B - R_A) / 400))
 *
 * @param {number} ratingA - Player A's current rating
 * @param {number} ratingB - Player B's current rating (or team average)
 * @returns {number} Expected score ∈ (0, 1)
 */
const calculateExpectedScore = (ratingA, ratingB) => {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
};

/**
 * Calculate the signed rating delta for a single player/team.
 *
 * Formula (PRD Section 7.1):
 *   Δ = K × (S_A - E_A)
 *
 * @param {number} rating         - Player/team current rating
 * @param {number} opponentRating - Opponent/team current rating
 * @param {number} actualScore    - 1 for win, 0 for loss
 * @param {number} [kFactor]      - Sensitivity constant (default from config)
 * @returns {number} Signed delta (positive for wins, negative for losses)
 */
const calculateRatingDelta = (rating, opponentRating, actualScore, kFactor) => {
  const k = typeof kFactor === 'number' ? kFactor : env.DEFAULT_K_FACTOR;
  const expected = calculateExpectedScore(rating, opponentRating);
  return k * (actualScore - expected);
};

/**
 * Calculate new rating from current rating + delta, floored at 0.
 *
 * @param {number} currentRating - Player's current rating
 * @param {number} delta         - Signed rating change
 * @returns {number} New rating (minimum 0 — ratings cannot go negative)
 */
const calculateNewRating = (currentRating, delta) => {
  return Math.max(0, Math.round(currentRating + delta));
};

// ──────────────────────────────────────────────
// Singles Match Rating Changes
// ──────────────────────────────────────────────

/**
 * Calculate rating changes for a Singles match.
 *
 * @param {object}  params
 * @param {object}  params.playerA    - { _id, currentRating }
 * @param {object}  params.playerB    - { _id, currentRating }
 * @param {string}  params.winnerSide - 'A' or 'B'
 * @param {number}  [params.kFactor]  - Sensitivity constant (default from config)
 * @returns {Array<{playerId, oldRating, newRating, delta}>}
 */
const calculateSinglesRatingChanges = ({ playerA, playerB, winnerSide, kFactor }) => {
  const k = typeof kFactor === 'number' ? kFactor : env.DEFAULT_K_FACTOR;

  const scoreA = winnerSide === 'A' ? 1 : 0;
  const scoreB = winnerSide === 'B' ? 1 : 0;

  const deltaA = calculateRatingDelta(playerA.currentRating, playerB.currentRating, scoreA, k);
  const deltaB = calculateRatingDelta(playerB.currentRating, playerA.currentRating, scoreB, k);

  return [
    {
      playerId: playerA._id,
      oldRating: playerA.currentRating,
      newRating: calculateNewRating(playerA.currentRating, deltaA),
      delta: Math.round(deltaA),
    },
    {
      playerId: playerB._id,
      oldRating: playerB.currentRating,
      newRating: calculateNewRating(playerB.currentRating, deltaB),
      delta: Math.round(deltaB),
    },
  ];
};

// ──────────────────────────────────────────────
// Doubles Match Rating Changes (PRD Section 7.2)
// ──────────────────────────────────────────────

/**
 * Clamp a value between min and max (inclusive).
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

/**
 * Calculate rating changes for a Doubles match using team-average
 * expected score with individually-weighted delta distribution.
 *
 * Full PRD Section 7.2 implementation (not MVP fallback):
 *
 * 1. Team average rating → expected score between teams.
 * 2. Team delta = K × (S_Team - E_Team).
 * 3. Each player's share is weighted by deviation from team average:
 *    - d_i = R_i - R_Team
 *    - raw_w_i = clamp(1 - d_i / 800, 0.75, 1.25)
 *    - Re-normalize so average of two weights = 1.0
 *    - δ_i = Δ_Team × w_i_normalized
 *
 * A weaker player gets a LARGER share of a positive delta (win)
 * and a SMALLER share of a negative delta (loss), and vice versa
 * for the stronger player.
 *
 * @param {object}   params
 * @param {Array}    params.teamA      - [{ _id, currentRating }, { _id, currentRating }]
 * @param {Array}    params.teamB      - [{ _id, currentRating }, { _id, currentRating }]
 * @param {string}   params.winnerTeam - 'A' or 'B'
 * @param {number}   [params.kFactor]  - Sensitivity constant (default from config)
 * @returns {Array<{playerId, oldRating, newRating, delta}>} - 4 entries (all players)
 */
const calculateDoublesRatingChanges = ({ teamA, teamB, winnerTeam, kFactor }) => {
  const k = typeof kFactor === 'number' ? kFactor : env.DEFAULT_K_FACTOR;

  // Step 1: Team average ratings
  const avgA = (teamA[0].currentRating + teamA[1].currentRating) / 2;
  const avgB = (teamB[0].currentRating + teamB[1].currentRating) / 2;

  // Step 2: Expected scores for each team (using team averages)
  const expectedA = calculateExpectedScore(avgA, avgB);
  const expectedB = calculateExpectedScore(avgB, avgA);

  // Actual scores
  const actualA = winnerTeam === 'A' ? 1 : 0;
  const actualB = winnerTeam === 'B' ? 1 : 0;

  // Step 3: Team deltas
  const teamDeltaA = k * (actualA - expectedA);
  const teamDeltaB = k * (actualB - expectedB);

  /**
   * Distribute team delta to individual players using weighted distribution.
   *
   * @param {Array}  team      - [player1, player2]
   * @param {number} teamAvg   - Average rating of the team
   * @param {number} teamDelta - Total team delta
   * @returns {Array} Individual rating change entries
   */
  const distributeTeamDelta = (team, teamAvg, teamDelta) => {
    // Calculate raw weights for each player
    const rawWeights = team.map((player) => {
      const deviation = player.currentRating - teamAvg;
      return clamp(1 - deviation / 800, 0.75, 1.25);
    });

    // Re-normalize so average of weights = 1.0
    // This ensures δ_1 + δ_2 sums to 2 × teamDelta
    // (i.e., average individual delta equals the team delta)
    const weightSum = rawWeights[0] + rawWeights[1];
    const normalizedWeights = rawWeights.map((w) => (2 * w) / weightSum);

    return team.map((player, i) => {
      const individualDelta = teamDelta * normalizedWeights[i];
      return {
        playerId: player._id,
        oldRating: player.currentRating,
        newRating: calculateNewRating(player.currentRating, individualDelta),
        delta: Math.round(individualDelta),
      };
    });
  };

  const teamAChanges = distributeTeamDelta(teamA, avgA, teamDeltaA);
  const teamBChanges = distributeTeamDelta(teamB, avgB, teamDeltaB);

  return [...teamAChanges, ...teamBChanges];
};

// ──────────────────────────────────────────────
// Unified Dispatcher
// ──────────────────────────────────────────────

/**
 * Calculate rating changes for any match type.
 * Single entry point for all match approval logic.
 *
 * @param {object}  params
 * @param {string}  params.matchType  - 'SINGLES' or 'DOUBLES'
 * @param {Array}   params.teamA      - Singles: [playerA], Doubles: [player1, player2]
 * @param {Array}   params.teamB      - Singles: [playerB], Doubles: [player1, player2]
 * @param {string}  params.winnerTeam - 'A' or 'B'
 * @param {number}  [params.kFactor]  - Sensitivity constant (default from config)
 * @returns {Array<{playerId, oldRating, newRating, delta}>}
 */
const calculateMatchRatingChanges = ({ matchType, teamA, teamB, winnerTeam, kFactor }) => {
  if (matchType === 'SINGLES') {
    return calculateSinglesRatingChanges({
      playerA: teamA[0],
      playerB: teamB[0],
      winnerSide: winnerTeam,
      kFactor,
    });
  }

  if (matchType === 'DOUBLES') {
    return calculateDoublesRatingChanges({
      teamA,
      teamB,
      winnerTeam,
      kFactor,
    });
  }

  throw new Error(`Unsupported match type: ${matchType}`);
};

module.exports = {
  calculateExpectedScore,
  calculateRatingDelta,
  calculateNewRating,
  calculateSinglesRatingChanges,
  calculateDoublesRatingChanges,
  calculateMatchRatingChanges,
};
