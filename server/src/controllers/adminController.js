/**
 * Admin Controller
 *
 * Handles administrative match verification, approvals, rejections,
 * direct official entries, and audit trail inspection per PRD Section 6, 10, & 12.
 *
 * @module controllers/adminController
 */

const mongoose = require('mongoose');
const User = require('../models/User');
const Match = require('../models/Match');
const AuditLog = require('../models/AuditLog');
const Counter = require('../models/Counter');
const { getOrCreatePlayerProfile } = require('../services/playerService');
const { validateMatchPayload } = require('./matchController');
const {
  executeAtomicMatchApproval,
  executeBatchMatchApproval,
  executeManualRatingAdjustment,
  executeMatchCorrection,
} = require('../services/adminService');

/**
 * @desc    Get all pending match submissions awaiting admin approval
 * @route   GET /api/admin/matches/pending
 * @access  Private (Admin Only)
 */
const getPendingMatches = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = Math.min(parseInt(limit, 10) || 20, 100);
    const skip = (pageNum - 1) * limitNum;

    const query = { status: 'PENDING_APPROVAL' };

    const [matches, total] = await Promise.all([
      Match.find(query)
        .populate('teamA', 'playerId name currentRating category profilePhoto email')
        .populate('teamB', 'playerId name currentRating category profilePhoto email')
        .populate('submittedBy', 'playerId name email')
        .sort({ createdAt: 1 }) // Oldest submissions first per spec
        .skip(skip)
        .limit(limitNum),
      Match.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      count: matches.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      data: matches,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Approve a pending match result with atomic rating updates
 * @route   POST /api/admin/matches/:id/approve
 * @access  Private (Admin Only)
 */
const approveMatch = async (req, res, next) => {
  try {
    const { id } = req.params;

    const approvedMatch = await executeAtomicMatchApproval({
      matchId: id,
      adminUserId: req.user._id,
      actionType: 'MATCH_APPROVE',
      isDirect: false,
    });

    res.status(200).json({
      success: true,
      message: `Match ${approvedMatch.matchId} approved successfully. Ratings and standings updated.`,
      data: approvedMatch,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Batch approve multiple pending matches in sequence
 * @route   POST /api/admin/matches/batch-approve
 * @access  Private (Admin Only)
 */
const batchApproveMatches = async (req, res, next) => {
  try {
    const { matchIds } = req.body;

    const result = await executeBatchMatchApproval({
      adminUserId: req.user._id,
      matchIds,
    });

    res.status(200).json({
      success: true,
      message: `Batch approval complete. Approved ${result.approvedCount} match(es).`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reject a pending match with mandatory reason
 * @route   POST /api/admin/matches/:id/reject
 * @access  Private (Admin Only)
 */
const rejectMatch = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'A rejection reason is mandatory to reject a match submission.',
      });
    }

    let match;
    if (mongoose.Types.ObjectId.isValid(id)) {
      match = await Match.findById(id);
    } else {
      match = await Match.findOne({ matchId: id.toUpperCase() });
    }

    if (!match) {
      return res.status(404).json({
        success: false,
        message: `Match '${id}' not found.`,
      });
    }

    // Concurrency guard: check if already processed
    if (match.status !== 'PENDING_APPROVAL') {
      return res.status(409).json({
        success: false,
        message: `Match '${match.matchId}' cannot be rejected because its current status is '${match.status}'.`,
      });
    }

    // Mark as rejected without rating mutations
    match.status = 'REJECTED';
    match.rejectionReason = reason.trim();
    match.approvedBy = req.user._id;
    match.approvedAt = new Date();
    await match.save();

    // Create AuditLog entry
    await AuditLog.create({
      action: 'MATCH_REJECT',
      performedBy: req.user._id,
      targetType: 'Match',
      targetId: match._id,
      metadata: {
        matchId: match.matchId,
        court: match.court,
        matchType: match.matchType,
        reason: reason.trim(),
      },
    });

    const populatedMatch = await Match.findById(match._id)
      .populate('teamA', 'playerId name currentRating category profilePhoto')
      .populate('teamB', 'playerId name currentRating category profilePhoto')
      .populate('submittedBy', 'playerId name')
      .populate('approvedBy', 'email role');

    res.status(200).json({
      success: true,
      message: `Match ${match.matchId} has been rejected.`,
      data: populatedMatch,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Directly record official match (auto-approved, atomic rating calculation)
 * @route   POST /api/admin/matches/direct
 * @access  Private (Admin Only)
 */
const createDirectMatch = async (req, res, next) => {
  try {
    const { matchType, court, teamA, teamB, scores, winnerTeam, isTournament = false } = req.body;

    const adminPlayer = await getOrCreatePlayerProfile(req.user);

    // Validate payload using shared validator (PRD Section 6.2)
    await validateMatchPayload({
      matchType,
      court,
      teamA,
      teamB,
      scores,
      winnerTeam,
      submitterPlayerId: adminPlayer._id,
      isAdmin: true,
    });

    // Generate atomic sequential Match ID
    const seq = await Counter.getNextSequence('matchId');
    const matchId = `PH-M${String(seq).padStart(5, '0')}`;

    // Create initial match document
    const match = await Match.create({
      matchId,
      court: court.trim(),
      matchType,
      isTournament: Boolean(isTournament),
      teamA,
      teamB,
      scores: scores.map((s) => ({
        teamAScore: Number(s.teamAScore),
        teamBScore: Number(s.teamBScore),
      })),
      winnerTeam,
      status: 'PENDING_APPROVAL', // Will transition to APPROVED atomically
      submittedBy: adminPlayer._id,
      recordedByAdmin: true,
    });

    // Execute shared atomic rating calculation and audit logging
    const approvedMatch = await executeAtomicMatchApproval({
      matchId: match._id,
      adminUserId: req.user._id,
      actionType: 'DIRECT_MATCH_CREATE',
      isDirect: true,
    });

    res.status(201).json({
      success: true,
      message: `Official match ${approvedMatch.matchId} recorded and ratings updated.`,
      data: approvedMatch,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get recent administrative audit logs
 * @route   GET /api/admin/audit-logs
 * @access  Private (Admin Only)
 */
const getAuditLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = Math.min(parseInt(limit, 10) || 20, 100);
    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      AuditLog.find()
        .populate('performedBy', 'email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      AuditLog.countDocuments(),
    ]);

    res.status(200).json({
      success: true,
      count: logs.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      data: logs,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Promote a user account to ADMIN role
 * @route   POST /api/admin/users/:id/promote
 * @access  Private (Admin Only)
 */
const promoteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    let targetUser;
    if (mongoose.Types.ObjectId.isValid(id)) {
      targetUser = await User.findById(id);
    } else {
      targetUser = await User.findOne({ email: id.toLowerCase().trim() });
    }

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: `User '${id}' not found.`,
      });
    }

    if (targetUser.role === 'ADMIN') {
      return res.status(200).json({
        success: true,
        message: `User ${targetUser.email} is already an administrator.`,
        data: {
          userId: targetUser._id,
          email: targetUser.email,
          role: targetUser.role,
        },
      });
    }

    targetUser.role = 'ADMIN';
    await targetUser.save();

    // Log action in AuditLog
    await AuditLog.create({
      action: 'USER_ROLE_PROMOTE',
      performedBy: req.user._id,
      targetType: 'User',
      targetId: targetUser._id,
      metadata: {
        email: targetUser.email,
        promotedRole: 'ADMIN',
      },
    });

    res.status(200).json({
      success: true,
      message: 'User promoted to ADMIN. The user must log in again for elevated admin access to take effect.',
      data: {
        userId: targetUser._id,
        email: targetUser.email,
        role: targetUser.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Manually adjust player rating with mandatory audit reason (Rule G, PRD Section 13)
 * @route   POST /api/admin/ratings/adjust
 * @access  Private (Admin Only)
 */
const adjustRating = async (req, res, next) => {
  try {
    const { playerId, newRating, reason } = req.body;

    const result = await executeManualRatingAdjustment({
      adminUserId: req.user._id,
      playerId,
      newRating,
      reason,
    });

    res.status(200).json({
      success: true,
      message: `Rating for ${result.player.name} (${result.player.playerId}) successfully adjusted to ${result.player.currentRating} Elo.`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Correct match score with mandatory audit reason (Rule G, PRD Section 13)
 * @route   PUT /api/admin/matches/:id/correct
 * @access  Private (Admin Only)
 */
const correctMatch = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { scores, winnerTeam, reason } = req.body;

    const corrected = await executeMatchCorrection({
      adminUserId: req.user._id,
      matchId: id,
      newScores: scores,
      newWinnerTeam: winnerTeam,
      reason,
    });

    res.status(200).json({
      success: true,
      message: `Match ${corrected.matchId} score successfully corrected.`,
      data: corrected,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPendingMatches,
  approveMatch,
  batchApproveMatches,
  rejectMatch,
  createDirectMatch,
  getAuditLogs,
  promoteUser,
  adjustRating,
  correctMatch,
};
