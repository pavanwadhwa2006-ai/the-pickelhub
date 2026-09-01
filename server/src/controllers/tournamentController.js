/**
 * Tournament Controller
 *
 * Handles player tournament discovery, atomic registration with capacity guards,
 * status-gated withdrawal, bracket advancement, and administrative bonus payouts.
 */

const mongoose = require('mongoose');
const Tournament = require('../models/Tournament');
const Player = require('../models/Player');
const RatingHistory = require('../models/RatingHistory');
const AuditLog = require('../models/AuditLog');
const {
  seedParticipants,
  generateBracketTree,
  advanceBracketMatch,
  executeTournamentBonusPayout,
} = require('../services/tournamentService');
const { getOrCreatePlayerProfile } = require('../services/playerService');

/**
 * @desc    Get all tournaments with optional filters
 * @route   GET /api/tournaments
 * @access  Public
 */
const getTournaments = async (req, res, next) => {
  try {
    const { status, category, tournamentType } = req.query;
    const filter = {};

    if (status) {
      filter.status = status;
    }
    if (category && category !== 'All') {
      filter.category = category;
    }
    if (tournamentType) {
      filter.tournamentType = tournamentType;
    }

    const tournaments = await Tournament.find(filter)
      .populate('participants.player', 'name playerId currentRating category profilePhoto')
      .populate('participants.partner', 'name playerId currentRating category profilePhoto')
      .populate('winner', 'name playerId currentRating category profilePhoto')
      .populate('runnerUp', 'name playerId currentRating category profilePhoto')
      .sort({ startDate: 1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: tournaments.length,
      data: tournaments,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single tournament details by ID with populated bracket
 * @route   GET /api/tournaments/:id
 * @access  Public
 */
const getTournamentById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid tournament ID format',
      });
    }

    const tournament = await Tournament.findById(id)
      .populate('participants.player', 'name playerId currentRating category profilePhoto')
      .populate('participants.partner', 'name playerId currentRating category profilePhoto')
      .populate('bracket.player1', 'name playerId currentRating category profilePhoto')
      .populate('bracket.player2', 'name playerId currentRating category profilePhoto')
      .populate('bracket.partner1', 'name playerId currentRating category profilePhoto')
      .populate('bracket.partner2', 'name playerId currentRating category profilePhoto')
      .populate('bracket.winner', 'name playerId currentRating category profilePhoto')
      .populate('winner', 'name playerId currentRating category profilePhoto')
      .populate('runnerUp', 'name playerId currentRating category profilePhoto')
      .populate('semiFinalists', 'name playerId currentRating category profilePhoto')
      .populate('createdBy', 'email role');

    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found',
      });
    }

    res.status(200).json({
      success: true,
      data: tournament,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Register / apply for a tournament (Atomic Capacity Guard & Eligibility Checks)
 * @route   POST /api/tournaments/:id/register
 * @access  Private (Authenticated Players)
 */
const registerForTournament = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { partnerId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid tournament ID format',
      });
    }

    // 1. Get or create player profile for authenticated user
    const player = await getOrCreatePlayerProfile(req.user._id, {
      name: req.user.name || req.user.email?.split('@')[0],
      email: req.user.email,
    });

    // 2. Validate Suspended-Player Exclusion (PRD Section 8.3 & Review Item 4)
    if (player.isSuspended === true || player.accountStatus === 'SUSPENDED') {
      return res.status(403).json({
        success: false,
        message: 'Suspended players are not eligible to register for club tournaments.',
      });
    }

    // 3. Fetch Tournament and check state
    const tournament = await Tournament.findById(id);
    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found',
      });
    }

    if (tournament.status !== 'REGISTRATION_OPEN') {
      return res.status(400).json({
        success: false,
        message: `Registration is not open for this tournament (Status: ${tournament.status}).`,
      });
    }

    if (new Date() > new Date(tournament.registrationDeadline)) {
      return res.status(400).json({
        success: false,
        message: 'Registration deadline for this tournament has passed.',
      });
    }

    // 4. Validate skill category eligibility
    if (tournament.category !== 'All' && player.category !== tournament.category) {
      return res.status(400).json({
        success: false,
        message: `This tournament is restricted to the '${tournament.category}' division. Your current division is '${player.category}'.`,
      });
    }

    // 5. Handle partner validation for Doubles / Mixed
    let partnerPlayer = null;
    const isDoubles =
      tournament.tournamentType === 'DOUBLES' || tournament.tournamentType === 'MIXED_DOUBLES';

    if (isDoubles) {
      if (!partnerId) {
        return res.status(400).json({
          success: false,
          message: 'Partner selection is required for Doubles tournament registrations.',
        });
      }

      if (!mongoose.Types.ObjectId.isValid(partnerId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid partner player ID.',
        });
      }

      if (partnerId.toString() === player._id.toString()) {
        return res.status(400).json({
          success: false,
          message: 'You cannot select yourself as your doubles partner.',
        });
      }

      partnerPlayer = await Player.findById(partnerId);
      if (!partnerPlayer) {
        return res.status(404).json({
          success: false,
          message: 'Selected partner player profile not found.',
        });
      }
    }

    // 6. Compute seed rating
    const seedRating = isDoubles && partnerPlayer
      ? Math.round((player.currentRating + partnerPlayer.currentRating) / 2)
      : player.currentRating;

    // 7. Atomic Concurrency Capacity Check (Review Item 3)
    const updatedTournament = await Tournament.findOneAndUpdate(
      {
        _id: id,
        status: 'REGISTRATION_OPEN',
        'participants.player': { $ne: player._id },
        $expr: { $lt: [{ $size: '$participants' }, '$maxParticipants'] },
      },
      {
        $push: {
          participants: {
            player: player._id,
            partner: partnerPlayer ? partnerPlayer._id : null,
            seedRating,
            registeredAt: new Date(),
            appliedBy: req.user._id,
          },
        },
      },
      { new: true }
    );

    if (!updatedTournament) {
      // Determine exact failure reason for clear UX feedback
      const current = await Tournament.findById(id);
      const isRegistered = current?.participants.some(
        (p) => p.player.toString() === player._id.toString()
      );

      if (isRegistered) {
        return res.status(400).json({
          success: false,
          message: 'You are already registered for this competition.',
        });
      }

      if (current && current.participants.length >= current.maxParticipants) {
        return res.status(400).json({
          success: false,
          message: 'Tournament capacity is full. No more slots available.',
        });
      }

      return res.status(400).json({
        success: false,
        message: 'Could not complete registration. Tournament status may have changed.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Successfully registered for competition!',
      data: {
        tournamentId: updatedTournament._id,
        name: updatedTournament.name,
        participantCount: updatedTournament.participants.length,
        maxParticipants: updatedTournament.maxParticipants,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Withdraw application / unregister from tournament (Status-Gated)
 * @route   DELETE /api/tournaments/:id/register
 * @access  Private (Authenticated Players)
 */
const withdrawFromTournament = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid tournament ID format',
      });
    }

    const player = await Player.findOne({ userId: req.user._id });
    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player profile not found',
      });
    }

    const tournament = await Tournament.findById(id);
    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found',
      });
    }

    // Status-Gated Withdrawal (Review Item 6)
    if (tournament.status !== 'REGISTRATION_OPEN') {
      return res.status(400).json({
        success: false,
        message: 'Cannot withdraw once tournament registration has been closed or tournament is in progress.',
      });
    }

    if (new Date() > new Date(tournament.registrationDeadline)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot withdraw after registration deadline has passed.',
      });
    }

    const isRegistered = tournament.participants.some(
      (p) => p.player.toString() === player._id.toString()
    );

    if (!isRegistered) {
      return res.status(400).json({
        success: false,
        message: 'You are not registered for this tournament.',
      });
    }

    tournament.participants = tournament.participants.filter(
      (p) => p.player.toString() !== player._id.toString()
    );
    await tournament.save();

    res.status(200).json({
      success: true,
      message: 'Successfully withdrawn from competition registration.',
      data: {
        tournamentId: tournament._id,
        participantCount: tournament.participants.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// Administrative Competition Controllers
// ==========================================

/**
 * @desc    Create / arrange a new competition
 * @route   POST /api/admin/tournaments
 * @access  Private (Admin Only)
 */
const createTournament = async (req, res, next) => {
  try {
    const {
      name,
      description,
      tournamentType = 'SINGLES',
      category = 'All',
      startDate,
      registrationDeadline,
      maxParticipants = 16,
      seedingType = 'RATING_BASED',
      bonusConfig,
    } = req.body;

    if (!name || !startDate || !registrationDeadline) {
      return res.status(400).json({
        success: false,
        message: 'Name, start date, and registration deadline are required.',
      });
    }

    if (new Date(registrationDeadline) > new Date(startDate)) {
      return res.status(400).json({
        success: false,
        message: 'Registration deadline must be before tournament start date.',
      });
    }

    const tournament = await Tournament.create({
      name,
      description,
      tournamentType,
      category,
      startDate,
      registrationDeadline,
      maxParticipants,
      seedingType,
      bonusConfig: bonusConfig || {
        winnerBonus: 50,
        runnerUpBonus: 25,
        semiFinalistBonus: 10,
      },
      status: 'REGISTRATION_OPEN',
      createdBy: req.user._id,
    });

    await AuditLog.create({
      action: 'TOURNAMENT_CREATE',
      performedBy: req.user._id,
      targetType: 'Tournament',
      targetId: tournament._id,
      metadata: {
        name: tournament.name,
        tournamentType: tournament.tournamentType,
        category: tournament.category,
        maxParticipants: tournament.maxParticipants,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Tournament competition successfully created.',
      data: tournament,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update tournament details
 * @route   PUT /api/admin/tournaments/:id
 * @access  Private (Admin Only)
 */
const updateTournament = async (req, res, next) => {
  try {
    const { id } = req.params;

    const tournament = await Tournament.findById(id);
    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found',
      });
    }

    if (tournament.status === 'COMPLETED') {
      return res.status(400).json({
        success: false,
        message: 'Completed tournaments cannot be modified.',
      });
    }

    const allowedUpdates = [
      'name',
      'description',
      'category',
      'startDate',
      'registrationDeadline',
      'maxParticipants',
      'seedingType',
      'bonusConfig',
      'status',
    ];

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        tournament[field] = req.body[field];
      }
    });

    await tournament.save();

    await AuditLog.create({
      action: 'TOURNAMENT_UPDATE',
      performedBy: req.user._id,
      targetType: 'Tournament',
      targetId: tournament._id,
      metadata: { updates: req.body },
    });

    res.status(200).json({
      success: true,
      message: 'Tournament updated successfully.',
      data: tournament,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Close tournament registration
 * @route   POST /api/admin/tournaments/:id/close-registration
 * @access  Private (Admin Only)
 */
const closeRegistration = async (req, res, next) => {
  try {
    const { id } = req.params;

    const tournament = await Tournament.findById(id);
    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found',
      });
    }

    if (tournament.status !== 'REGISTRATION_OPEN') {
      return res.status(400).json({
        success: false,
        message: `Cannot close registration on a tournament with status '${tournament.status}'.`,
      });
    }

    tournament.status = 'REGISTRATION_CLOSED';
    await tournament.save();

    res.status(200).json({
      success: true,
      message: 'Tournament registration closed successfully.',
      data: tournament,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Generate seeded bracket and start competition
 * @route   POST /api/admin/tournaments/:id/generate-bracket
 * @access  Private (Admin Only)
 */
const generateBracket = async (req, res, next) => {
  try {
    const { id } = req.params;

    const tournament = await Tournament.findById(id)
      .populate('participants.player')
      .populate('participants.partner');

    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found',
      });
    }

    if (tournament.participants.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'At least 2 participants are required to generate a bracket.',
      });
    }

    // 1. Seed participants
    seedParticipants(tournament.participants, tournament.tournamentType);

    // 2. Generate bracket tree
    const bracket = generateBracketTree(tournament);

    tournament.bracket = bracket;
    tournament.status = 'IN_PROGRESS';
    await tournament.save();

    res.status(200).json({
      success: true,
      message: 'Tournament bracket successfully generated and competition is now IN_PROGRESS!',
      data: tournament,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Record bracket match score and advance winner
 * @route   POST /api/admin/tournaments/:id/matches/score
 * @access  Private (Admin Only)
 */
const recordMatchScore = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { matchId, score1, score2 } = req.body;

    if (!matchId || score1 === undefined || score2 === undefined) {
      return res.status(400).json({
        success: false,
        message: 'matchId, score1, and score2 are required.',
      });
    }

    const tournament = await Tournament.findById(id);
    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found',
      });
    }

    if (tournament.status !== 'IN_PROGRESS') {
      return res.status(400).json({
        success: false,
        message: 'Can only record bracket scores for tournaments IN_PROGRESS.',
      });
    }

    // Advance match
    advanceBracketMatch(tournament, matchId, Number(score1), Number(score2));
    await tournament.save();

    res.status(200).json({
      success: true,
      message: 'Match score recorded and winner advanced successfully.',
      data: tournament,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Award tournament rating bonuses atomically (Winner +50, Runner-up +25, Semi-finalists +10)
 * @route   POST /api/admin/tournaments/:id/award-bonuses
 * @access  Private (Admin Only)
 */
const awardBonuses = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await executeTournamentBonusPayout(id, req.user._id);

    res.status(200).json({
      success: true,
      message: 'Tournament rating bonuses successfully distributed atomically!',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get paginated rating history audit table (Master Plan Part A3 & Item 9)
 * @route   GET /api/admin/rating-history
 * @access  Private (Admin Only)
 */
const getRatingHistory = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, changeType, playerId } = req.query;

    const filter = {};
    if (changeType) {
      filter.changeType = changeType;
    }
    if (playerId && mongoose.Types.ObjectId.isValid(playerId)) {
      filter.playerId = playerId;
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = Math.min(parseInt(limit, 10) || 20, 100);
    const skip = (pageNum - 1) * limitNum;

    const [records, total] = await Promise.all([
      RatingHistory.find(filter)
        .populate('playerId', 'name playerId currentRating category profilePhoto')
        .populate('recordedBy', 'email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      RatingHistory.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      count: records.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      data: records,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTournaments,
  getTournamentById,
  registerForTournament,
  withdrawFromTournament,
  createTournament,
  updateTournament,
  closeRegistration,
  generateBracket,
  recordMatchScore,
  awardBonuses,
  getRatingHistory,
};
