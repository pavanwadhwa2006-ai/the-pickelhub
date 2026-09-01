/**
 * Admin Service — The PickleHub Administrative Engine
 *
 * Provides transaction-safe atomic match approval, direct match recording,
 * and audit logging per PRD Section 6, Section 10, and Section 12.
 *
 * @module services/adminService
 */

const mongoose = require('mongoose');
const Match = require('../models/Match');
const Player = require('../models/Player');
const RatingHistory = require('../models/RatingHistory');
const AuditLog = require('../models/AuditLog');
const { calculateMatchRatingChanges } = require('./ratingService');
const { calculateCategory } = require('./playerService');

/**
 * Executes atomic rating updates and audit logging for an approved or direct match
 * within a single MongoDB ACID transaction.
 *
 * @param {object} params
 * @param {string|mongoose.Types.ObjectId} params.matchId - ObjectId or matchId string of Match
 * @param {mongoose.Types.ObjectId} params.adminUserId   - Authenticated Admin User ObjectId
 * @param {string} [params.actionType='MATCH_APPROVE']   - 'MATCH_APPROVE' | 'DIRECT_MATCH_CREATE'
 * @param {boolean} [params.isDirect=false]              - True if direct recording
 * @param {mongoose.ClientSession} [params.existingSession] - Optional existing session for testing/nesting
 * @returns {Promise<Match>} Populated approved match document
 */
const executeAtomicMatchApproval = async ({
  matchId,
  adminUserId,
  actionType = 'MATCH_APPROVE',
  isDirect = false,
  existingSession = null,
}) => {
  const session = existingSession || (await mongoose.startSession());
  const isOwnerSession = !existingSession;

  if (isOwnerSession) {
    session.startTransaction();
  }

  try {
    // 1. Fetch match within transaction session
    let match;
    if (mongoose.Types.ObjectId.isValid(matchId)) {
      match = await Match.findById(matchId).session(session);
    } else {
      match = await Match.findOne({ matchId }).session(session);
    }

    if (!match) {
      const err = new Error(`Match '${matchId}' not found.`);
      err.statusCode = 404;
      throw err;
    }

    // 2. Concurrency Guard: Abort if already processed (unless direct creation which is set up in caller)
    if (!isDirect && match.status !== 'PENDING_APPROVAL') {
      const err = new Error(
        `Match '${match.matchId}' cannot be approved because its current status is '${match.status}'.`
      );
      err.statusCode = 409; // 409 Conflict
      throw err;
    }

    // 3. Fetch all participating player documents within session
    const teamAPlayerIds = match.teamA.map((id) => id.toString());
    const teamBPlayerIds = match.teamB.map((id) => id.toString());
    const allPlayerIds = [...teamAPlayerIds, ...teamBPlayerIds];

    const playerDocs = await Player.find({
      _id: { $in: allPlayerIds },
    }).session(session);

    if (playerDocs.length !== allPlayerIds.length) {
      const err = new Error('One or more participating player profiles could not be found.');
      err.statusCode = 404;
      throw err;
    }

    // Map player documents by ID string for fast retrieval
    const playerMap = new Map();
    playerDocs.forEach((p) => playerMap.set(p._id.toString(), p));

    // Construct team objects with current ratings for ratingService
    const teamAPlayers = teamAPlayerIds.map((id) => playerMap.get(id));
    const teamBPlayers = teamBPlayerIds.map((id) => playerMap.get(id));

    // 4. Calculate exact Elo deltas using ratingService (PRD Section 7)
    const ratingChanges = calculateMatchRatingChanges({
      matchType: match.matchType,
      teamA: teamAPlayers,
      teamB: teamBPlayers,
      winnerTeam: match.winnerTeam,
    });

    const isWinnerA = match.winnerTeam === 'A';
    const winningPlayerIds = new Set(
      (isWinnerA ? teamAPlayerIds : teamBPlayerIds).map((id) => id.toString())
    );

    // 5. Atomically update each player and record RatingHistory
    const ratingHistoryDocs = [];

    for (const change of ratingChanges) {
      const pIdStr = change.playerId.toString();
      const player = playerMap.get(pIdStr);

      const oldRating = player.currentRating;
      const newRating = change.newRating;
      const oldCategory = player.category;
      const newCategory = calculateCategory(newRating);

      const isWinner = winningPlayerIds.has(pIdStr);

      // Mutate player career stats
      player.currentRating = newRating;
      player.highestRating = Math.max(player.highestRating || 1000, newRating);
      player.category = newCategory;
      player.matchesPlayed = (player.matchesPlayed || 0) + 1;

      if (isWinner) {
        player.wins = (player.wins || 0) + 1;
        player.winningStreak = (player.winningStreak || 0) + 1;
      } else {
        player.losses = (player.losses || 0) + 1;
        player.winningStreak = 0;
      }

      await player.save({ session });

      // Create rating history record
      ratingHistoryDocs.push({
        playerId: player._id,
        changeType: 'MATCH',
        matchId: match._id,
        ratingBefore: oldRating,
        ratingAfter: newRating,
        delta: change.delta,
        categoryBefore: oldCategory,
        categoryAfter: newCategory,
        createdAt: new Date(),
      });
    }

    // Insert all rating history records in session
    await RatingHistory.insertMany(ratingHistoryDocs, { session });

    // 6. Update Match document state
    match.status = 'APPROVED';
    match.approvedBy = adminUserId;
    match.approvedAt = new Date();
    match.ratingChanges = ratingChanges.map((c) => ({
      playerId: c.playerId,
      oldRating: c.oldRating,
      newRating: c.newRating,
      delta: c.delta,
    }));

    await match.save({ session });

    // 7. Write AuditLog entry
    await AuditLog.create(
      [
        {
          action: actionType,
          performedBy: adminUserId,
          targetType: 'Match',
          targetId: match._id,
          metadata: {
            matchId: match.matchId,
            court: match.court,
            matchType: match.matchType,
            winnerTeam: match.winnerTeam,
            ratingChanges: match.ratingChanges,
            isDirect,
          },
          createdAt: new Date(),
        },
      ],
      { session }
    );

    // Commit the transaction
    if (isOwnerSession) {
      await session.commitTransaction();
    }

    // Return populated match
    const populatedMatch = await Match.findById(match._id)
      .populate('teamA', 'playerId name currentRating category profilePhoto')
      .populate('teamB', 'playerId name currentRating category profilePhoto')
      .populate('submittedBy', 'playerId name')
      .populate('approvedBy', 'email role');

    return populatedMatch;
  } catch (error) {
    if (isOwnerSession && session.inTransaction()) {
      await session.abortTransaction();
    }
    throw error;
  } finally {
    if (isOwnerSession) {
      await session.endSession();
    }
  }
};

module.exports = {
  executeAtomicMatchApproval,
};
