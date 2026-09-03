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

/**
 * Executes batch approval for multiple pending matches.
 * Approves matches sequentially, each protected by an atomic transaction.
 *
 * @param {object} params
 * @param {mongoose.Types.ObjectId} params.adminUserId - Authenticated Admin User ObjectId
 * @param {Array<string|mongoose.Types.ObjectId>} [params.matchIds] - Optional specific IDs to approve
 * @returns {Promise<object>} Summary with approvedCount, approvedMatches, and errors
 */
const executeBatchMatchApproval = async ({ adminUserId, matchIds = null }) => {
  let targets = [];
  if (Array.isArray(matchIds) && matchIds.length > 0) {
    targets = matchIds;
  } else {
    const pending = await Match.find({ status: 'PENDING_APPROVAL' }).select('_id matchId');
    targets = pending.map((m) => m._id);
  }

  const approvedMatches = [];
  const errors = [];

  for (const matchId of targets) {
    try {
      const approved = await executeAtomicMatchApproval({
        matchId,
        adminUserId,
        actionType: 'MATCH_APPROVE',
        isDirect: false,
      });
      approvedMatches.push(approved);
    } catch (err) {
      errors.push({ matchId, message: err.message });
    }
  }

  return {
    totalRequested: targets.length,
    approvedCount: approvedMatches.length,
    approvedMatches,
    errors,
  };
};

/**
 * Executes a manual rating adjustment with mandatory audit justification.
 * (PRD Section 13 "No Quiet Changes" & Milestone 9)
 */
const executeManualRatingAdjustment = async ({ adminUserId, playerId, newRating, reason }) => {
  if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
    const err = new Error('A valid justification reason (minimum 5 characters) is required for manual rating adjustments.');
    err.statusCode = 400;
    throw err;
  }

  const ratingNum = parseInt(newRating, 10);
  if (isNaN(ratingNum) || ratingNum < 0) {
    const err = new Error('A valid non-negative integer rating is required.');
    err.statusCode = 400;
    throw err;
  }

  let player = null;
  if (mongoose.Types.ObjectId.isValid(playerId)) {
    player = await Player.findById(playerId);
  } else {
    player = await Player.findOne({ playerId: playerId.toString().toUpperCase() });
  }

  if (!player) {
    const err = new Error(`Player '${playerId}' not found.`);
    err.statusCode = 404;
    throw err;
  }

  const ratingBefore = player.currentRating;
  const categoryBefore = player.category;
  const delta = ratingNum - ratingBefore;
  const categoryAfter = calculateCategory(ratingNum);

  // Update Player
  player.currentRating = ratingNum;
  player.highestRating = Math.max(player.highestRating, ratingNum);
  player.category = categoryAfter;
  await player.save();

  // Create RatingHistory
  const ratingHistory = await RatingHistory.create({
    playerId: player._id,
    changeType: 'MANUAL_ADJUSTMENT',
    ratingBefore,
    ratingAfter: ratingNum,
    delta,
    categoryBefore,
    categoryAfter,
    reason: reason.trim(),
    recordedBy: adminUserId,
    createdAt: new Date(),
  });

  // Create AuditLog
  await AuditLog.create({
    action: 'MANUAL_RATING_ADJUST',
    performedBy: adminUserId,
    targetType: 'Player',
    targetId: player._id,
    metadata: {
      playerId: player.playerId,
      playerName: player.name,
      previousRating: ratingBefore,
      newRating: ratingNum,
      delta,
      reason: reason.trim(),
    },
    createdAt: new Date(),
  });

  return { player, ratingHistory };
};

/**
 * Executes a match correction with mandatory audit reason.
 * (PRD Section 13 & Milestone 9)
 */
const executeMatchCorrection = async ({ adminUserId, matchId, newScores, newWinnerTeam, reason }) => {
  if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
    const err = new Error('A valid justification reason (minimum 5 characters) is required to correct a match score.');
    err.statusCode = 400;
    throw err;
  }

  let match = null;
  if (mongoose.Types.ObjectId.isValid(matchId)) {
    match = await Match.findById(matchId);
  } else {
    match = await Match.findOne({ matchId });
  }

  if (!match) {
    const err = new Error(`Match '${matchId}' not found.`);
    err.statusCode = 404;
    throw err;
  }

  const oldScores = match.scores;
  const oldWinner = match.winnerTeam;

  match.scores = newScores || match.scores;
  if (newWinnerTeam) match.winnerTeam = newWinnerTeam;
  match.isCorrected = true;
  match.correctionReason = reason.trim();
  match.correctedBy = adminUserId;
  match.correctedAt = new Date();

  await match.save();

  // Create AuditLog
  await AuditLog.create({
    action: 'MATCH_CORRECT',
    performedBy: adminUserId,
    targetType: 'Match',
    targetId: match._id,
    metadata: {
      matchId: match.matchId,
      oldScores,
      newScores: match.scores,
      oldWinner,
      newWinner: match.winnerTeam,
      reason: reason.trim(),
    },
    createdAt: new Date(),
  });

  return match;
};

module.exports = {
  executeAtomicMatchApproval,
  executeBatchMatchApproval,
  executeManualRatingAdjustment,
  executeMatchCorrection,
};
