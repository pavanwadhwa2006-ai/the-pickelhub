/**
 * Tournament Service
 *
 * Implements bracket seeding, power-of-2 single-elimination bracket generation,
 * match advancement, and atomic tournament bonus payouts via MongoDB ACID transactions.
 */

const mongoose = require('mongoose');
const Tournament = require('../models/Tournament');
const Player = require('../models/Player');
const RatingHistory = require('../models/RatingHistory');
const AuditLog = require('../models/AuditLog');
const { calculateCategory } = require('./playerService');

/**
 * Standard tournament bracket seed order generator (Power of 2).
 * e.g., for N=8: [1, 8, 4, 5, 2, 7, 3, 6] -> pairs: (1 vs 8), (4 vs 5), (2 vs 7), (3 vs 6)
 *
 * @param {number} numParticipants - Power of 2 (4, 8, 16, 32, 64)
 * @returns {number[]} Array of seed numbers in standard bracket order
 */
const getSeedingOrder = (numParticipants) => {
  const rounds = Math.log2(numParticipants) - 1;
  let pls = [1, 2];
  for (let i = 0; i < rounds; i++) {
    const nextRound = [];
    const length = pls.length * 2 + 1;
    for (let j = 0; j < pls.length; j++) {
      nextRound.push(pls[j]);
      nextRound.push(length - pls[j]);
    }
    pls = nextRound;
  }
  return pls;
};

/**
 * Compute seeds for tournament participants based on individual rating or team average.
 *
 * @param {Array} participants - Tournament participants array
 * @param {string} tournamentType - 'SINGLES' | 'DOUBLES' | 'MIXED_DOUBLES' | 'OPEN'
 * @returns {Array} Participants with seed and seedRating assigned
 */
const seedParticipants = (participants, tournamentType) => {
  const isDoubles = tournamentType === 'DOUBLES' || tournamentType === 'MIXED_DOUBLES';

  // Compute seedRating for each participant entry
  participants.forEach((p) => {
    const rating1 = p.player?.currentRating ?? 1000;
    if (isDoubles && p.partner) {
      const rating2 = p.partner?.currentRating ?? 1000;
      p.seedRating = Math.round((rating1 + rating2) / 2);
    } else {
      p.seedRating = rating1;
    }
  });

  // Sort descending by seedRating
  participants.sort((a, b) => b.seedRating - a.seedRating);

  // Assign 1-indexed seeds
  participants.forEach((p, idx) => {
    p.seed = idx + 1;
  });

  return participants;
};

/**
 * Generate a full single-elimination tournament bracket with automatic Bye advancement.
 *
 * @param {object} tournament - Tournament Mongoose document (populated with participants.player and participants.partner)
 * @returns {Array} Array of bracket match objects
 */
const generateBracketTree = (tournament) => {
  const participants = tournament.participants;
  const count = participants.length;

  if (count < 2) {
    throw new Error('At least 2 participants are required to generate a tournament bracket.');
  }

  // Determine bracket power of 2 size (4, 8, 16, 32, 64)
  let bracketSize = 4;
  while (bracketSize < count && bracketSize < 64) {
    bracketSize *= 2;
  }

  const totalRounds = Math.log2(bracketSize);
  const seedOrder = getSeedingOrder(bracketSize);
  const bracket = [];

  // Map of seed -> participant entry
  const seedMap = new Map();
  participants.forEach((p) => {
    seedMap.set(p.seed, p);
  });

  // 1. Generate Round 1 Matches
  const round1MatchesCount = bracketSize / 2;
  for (let i = 0; i < round1MatchesCount; i++) {
    const seed1 = seedOrder[i * 2];
    const seed2 = seedOrder[i * 2 + 1];

    const p1 = seedMap.get(seed1) || null;
    const p2 = seedMap.get(seed2) || null;

    const matchId = `R1_M${i}`;

    // Check for Bye
    if (p1 && !p2) {
      bracket.push({
        matchId,
        round: 1,
        matchIndex: i,
        player1: p1.player._id || p1.player,
        player2: null,
        partner1: p1.partner ? p1.partner._id || p1.partner : null,
        partner2: null,
        score1: 1,
        score2: 0,
        winner: p1.player._id || p1.player,
        status: 'BYE',
      });
    } else if (!p1 && p2) {
      bracket.push({
        matchId,
        round: 1,
        matchIndex: i,
        player1: null,
        player2: p2.player._id || p2.player,
        partner1: null,
        partner2: p2.partner ? p2.partner._id || p2.partner : null,
        score1: 0,
        score2: 1,
        winner: p2.player._id || p2.player,
        status: 'BYE',
      });
    } else if (p1 && p2) {
      bracket.push({
        matchId,
        round: 1,
        matchIndex: i,
        player1: p1.player._id || p1.player,
        player2: p2.player._id || p2.player,
        partner1: p1.partner ? p1.partner._id || p1.partner : null,
        partner2: p2.partner ? p2.partner._id || p2.partner : null,
        score1: null,
        score2: null,
        winner: null,
        status: 'READY',
      });
    } else {
      bracket.push({
        matchId,
        round: 1,
        matchIndex: i,
        player1: null,
        player2: null,
        score1: null,
        score2: null,
        winner: null,
        status: 'PENDING',
      });
    }
  }

  // 2. Generate subsequent round match nodes (Round 2 to Final)
  let currentMatchesCount = round1MatchesCount / 2;
  for (let r = 2; r <= totalRounds; r++) {
    for (let i = 0; i < currentMatchesCount; i++) {
      const matchId = `R${r}_M${i}`;

      // Check if previous round matches were Byes and can immediately populate this round
      const prevM1 = bracket.find((m) => m.matchId === `R${r - 1}_M${i * 2}`);
      const prevM2 = bracket.find((m) => m.matchId === `R${r - 1}_M${i * 2 + 1}`);

      const p1Winner = prevM1?.winner || null;
      const p2Winner = prevM2?.winner || null;

      let status = 'PENDING';
      if (p1Winner && p2Winner) {
        status = 'READY';
      }

      bracket.push({
        matchId,
        round: r,
        matchIndex: i,
        player1: p1Winner,
        player2: p2Winner,
        score1: null,
        score2: null,
        winner: null,
        status,
      });
    }
    currentMatchesCount /= 2;
  }

  return bracket;
};

/**
 * Record score for a tournament bracket match, declare winner, and advance winner to next round.
 *
 * @param {object} tournament - Tournament Mongoose document
 * @param {string} matchId - Match identifier (e.g. 'R1_M0')
 * @param {number} score1 - Score of player/team 1
 * @param {number} score2 - Score of player/team 2
 * @returns {object} Updated tournament document
 */
const advanceBracketMatch = (tournament, matchId, score1, score2) => {
  const match = tournament.bracket.find((m) => m.matchId === matchId);
  if (!match) {
    const error = new Error(`Match '${matchId}' not found in tournament bracket.`);
    error.statusCode = 404;
    throw error;
  }

  if (match.status === 'COMPLETED' || match.status === 'BYE') {
    const error = new Error(`Match '${matchId}' is already finished.`);
    error.statusCode = 400;
    throw error;
  }

  if (!match.player1 || !match.player2) {
    const error = new Error(`Match '${matchId}' does not have both players determined yet.`);
    error.statusCode = 400;
    throw error;
  }

  if (score1 === score2) {
    const error = new Error('Draws are not permitted in tournament bracket matches.');
    error.statusCode = 400;
    throw error;
  }

  const winner = score1 > score2 ? match.player1 : match.player2;
  const loser = score1 > score2 ? match.player2 : match.player1;

  match.score1 = score1;
  match.score2 = score2;
  match.winner = winner;
  match.status = 'COMPLETED';

  const nextRound = match.round + 1;
  const nextMatchIndex = Math.floor(match.matchIndex / 2);
  const nextMatchId = `R${nextRound}_M${nextMatchIndex}`;

  const nextMatch = tournament.bracket.find((m) => m.matchId === nextMatchId);

  if (nextMatch) {
    // Advance winner into next round match node
    if (match.matchIndex % 2 === 0) {
      nextMatch.player1 = winner;
    } else {
      nextMatch.player2 = winner;
    }

    // If both slots are now filled in next round match, transition status to READY
    if (nextMatch.player1 && nextMatch.player2) {
      nextMatch.status = 'READY';
    }
  } else {
    // This was the Championship Final match!
    tournament.winner = winner;
    tournament.runnerUp = loser;

    // Collect semifinalists (losers of semifinal round)
    const semiRound = match.round - 1;
    if (semiRound >= 1) {
      const semiMatches = tournament.bracket.filter((m) => m.round === semiRound && m.status === 'COMPLETED');
      const semiLosers = [];
      semiMatches.forEach((sm) => {
        if (sm.winner && sm.player1 && sm.player2) {
          const l = sm.winner.toString() === sm.player1.toString() ? sm.player2 : sm.player1;
          semiLosers.push(l);
        }
      });
      tournament.semiFinalists = semiLosers;
    }

    tournament.status = 'COMPLETED';
  }

  return tournament;
};

/**
 * Execute atomic tournament bonus distribution inside a MongoDB ACID transaction.
 *
 * @param {string} tournamentId - Tournament ObjectId
 * @param {string} adminUserId - Admin User executing the payout
 * @returns {Promise<object>} Payout summary with updated player ratings and history records
 */
const executeTournamentBonusPayout = async (tournamentId, adminUserId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const tournament = await Tournament.findById(tournamentId)
      .populate('participants.player')
      .session(session);

    if (!tournament) {
      const error = new Error('Tournament not found');
      error.statusCode = 404;
      throw error;
    }

    if (tournament.status !== 'COMPLETED' || !tournament.winner) {
      const error = new Error('Tournament must be COMPLETED with a determined winner before bonuses can be awarded.');
      error.statusCode = 400;
      throw error;
    }

    // Concurrency Guard: prevent double bonus distribution (PRD Section 12 & Master Plan Item 2)
    if (tournament.bonusesAwarded === true) {
      const error = new Error('Tournament bonus points have already been awarded for this competition.');
      error.statusCode = 409;
      throw error;
    }

    const { winnerBonus = 50, runnerUpBonus = 25, semiFinalistBonus = 10 } = tournament.bonusConfig || {};

    const winnerId = tournament.winner.toString();
    const runnerUpId = tournament.runnerUp?.toString();
    const semiFinalistIds = (tournament.semiFinalists || []).map((id) => id.toString());

    const payoutRecords = [];

    // Helper to award bonus to a player
    const awardPlayerBonus = async (playerId, bonusPoints, placeTitle) => {
      if (!playerId || bonusPoints <= 0) return;

      const player = await Player.findById(playerId).session(session);
      if (!player) return;

      const ratingBefore = player.currentRating;
      const categoryBefore = player.category;
      const ratingAfter = ratingBefore + bonusPoints;
      const categoryAfter = calculateCategory(ratingAfter);

      player.currentRating = ratingAfter;
      if (ratingAfter > player.highestRating) {
        player.highestRating = ratingAfter;
      }
      player.category = categoryAfter;

      if (placeTitle === 'Winner') {
        player.tournamentWins = (player.tournamentWins || 0) + 1;
      }
      player.tournamentAppearances = (player.tournamentAppearances || 0) + 1;

      await player.save({ session });

      // Append RatingHistory document
      const [historyDoc] = await RatingHistory.create(
        [
          {
            playerId: player._id,
            matchId: null,
            ratingBefore,
            ratingAfter,
            delta: bonusPoints,
            categoryBefore,
            categoryAfter,
            changeType: 'TOURNAMENT_BONUS',
            reason: `Tournament ${placeTitle} Bonus: ${tournament.name}`,
            recordedBy: adminUserId,
          },
        ],
        { session }
      );

      payoutRecords.push({
        playerId: player._id,
        playerName: player.name,
        place: placeTitle,
        bonus: bonusPoints,
        ratingBefore,
        ratingAfter,
        historyId: historyDoc._id,
      });
    };

    // 1. Award Winner
    await awardPlayerBonus(winnerId, winnerBonus, 'Winner');

    // 2. Award Runner-Up
    if (runnerUpId && runnerUpId !== winnerId) {
      await awardPlayerBonus(runnerUpId, runnerUpBonus, 'Runner-Up');
    }

    // 3. Award Semi-Finalists
    for (const semiId of semiFinalistIds) {
      if (semiId !== winnerId && semiId !== runnerUpId) {
        await awardPlayerBonus(semiId, semiFinalistBonus, 'Semi-Finalist');
      }
    }

    // 4. Update tournament record
    tournament.bonusesAwarded = true;
    tournament.bonusesAwardedAt = new Date();
    await tournament.save({ session });

    // 5. Write administrative AuditLog
    await AuditLog.create(
      [
        {
          action: 'TOURNAMENT_BONUS_AWARD',
          performedBy: adminUserId,
          targetType: 'Tournament',
          targetId: tournament._id,
          metadata: {
            tournamentName: tournament.name,
            winnerBonus,
            runnerUpBonus,
            semiFinalistBonus,
            payouts: payoutRecords,
          },
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return {
      success: true,
      tournamentId: tournament._id,
      tournamentName: tournament.name,
      payouts: payoutRecords,
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

module.exports = {
  getSeedingOrder,
  seedParticipants,
  generateBracketTree,
  advanceBracketMatch,
  executeTournamentBonusPayout,
};
