/**
 * Match Controller
 *
 * Implements match submission and retrieval per PRD Section 6 and Section 10.3.
 * Enforces strict score majority validation, no-draws rule, participant count/distinctness,
 * and PENDING_APPROVAL status enforcement.
 */

const mongoose = require('mongoose');
const Match = require('../models/Match');
const Player = require('../models/Player');
const Counter = require('../models/Counter');
const { getOrCreatePlayerProfile } = require('../services/playerService');

/**
 * Validates match participants, counts, scores, and winner consistency.
 * @throws {Error} with status code if validation fails.
 */
const validateMatchPayload = async ({
  matchType,
  court,
  teamA,
  teamB,
  scores,
  winnerTeam,
  submitterPlayerId,
  isAdmin = false,
}) => {
  // 1. Basic field presence
  if (!matchType || !['SINGLES', 'DOUBLES'].includes(matchType)) {
    const err = new Error('Match type must be either SINGLES or DOUBLES.');
    err.statusCode = 400;
    throw err;
  }

  if (!court || typeof court !== 'string' || court.trim().length === 0) {
    const err = new Error('Court identifier is required.');
    err.statusCode = 400;
    throw err;
  }

  if (!Array.isArray(teamA) || !Array.isArray(teamB)) {
    const err = new Error('teamA and teamB must be arrays of player IDs.');
    err.statusCode = 400;
    throw err;
  }

  // 2. Player count validation
  const requiredCount = matchType === 'SINGLES' ? 1 : 2;
  if (teamA.length !== requiredCount || teamB.length !== requiredCount) {
    const err = new Error(
      `For ${matchType}, teamA and teamB must each contain exactly ${requiredCount} player${
        requiredCount > 1 ? 's' : ''
      }.`
    );
    err.statusCode = 400;
    throw err;
  }

  // 3. Distinct player check
  const allPlayerIdStrings = [...teamA, ...teamB].map((id) => id.toString());
  const uniquePlayerIds = new Set(allPlayerIdStrings);
  if (uniquePlayerIds.size !== allPlayerIdStrings.length) {
    const err = new Error('Duplicate players detected. Each participant in the match must be unique.');
    err.statusCode = 400;
    throw err;
  }

  // 4. Validate player existence and active status
  const playerDocs = await Player.find({
    _id: { $in: allPlayerIdStrings },
    accountStatus: 'ACTIVE',
  });

  if (playerDocs.length !== allPlayerIdStrings.length) {
    const err = new Error('One or more participating players are invalid, inactive, or not found.');
    err.statusCode = 400;
    throw err;
  }

  // 5. Submitter participation check
  if (!isAdmin && submitterPlayerId) {
    const isParticipant = allPlayerIdStrings.includes(submitterPlayerId.toString());
    if (!isParticipant) {
      const err = new Error('You must be a participating player in the match to submit scores.');
      err.statusCode = 403;
      throw err;
    }
  }

  // 6. Score structure & no-draws validation (PRD Section 6.2)
  if (!Array.isArray(scores) || scores.length === 0) {
    const err = new Error('At least one game score must be provided.');
    err.statusCode = 400;
    throw err;
  }

  let teamAGamesWon = 0;
  let teamBGamesWon = 0;

  for (let i = 0; i < scores.length; i++) {
    const game = scores[i];
    const scoreA = Number(game.teamAScore);
    const scoreB = Number(game.teamBScore);

    if (isNaN(scoreA) || isNaN(scoreB) || scoreA < 0 || scoreB < 0) {
      const err = new Error(`Game ${i + 1} has invalid scores. Scores must be non-negative numbers.`);
      err.statusCode = 400;
      throw err;
    }

    // PRD Section 6.2.3: No draws permitted at the game level
    if (scoreA === scoreB) {
      const err = new Error(
        `Game ${i + 1} score is tied (${scoreA}-${scoreB}). Pickleball games cannot end in a draw.`
      );
      err.statusCode = 400;
      throw err;
    }

    if (scoreA > scoreB) {
      teamAGamesWon++;
    } else {
      teamBGamesWon++;
    }
  }

  // PRD Section 6.2.4: No draws permitted at the match level
  if (teamAGamesWon === teamBGamesWon) {
    const err = new Error(
      `Match cannot end in a tie (${teamAGamesWon} games to ${teamBGamesWon}). A decisive winner is required.`
    );
    err.statusCode = 400;
    throw err;
  }

  // PRD Section 6.2.2: Winner consistency with majority games won
  const computedWinner = teamAGamesWon > teamBGamesWon ? 'A' : 'B';
  if (winnerTeam !== computedWinner) {
    const err = new Error(
      `Winner team '${winnerTeam}' contradicts the game scores. Team ${computedWinner} won ${Math.max(
        teamAGamesWon,
        teamBGamesWon
      )} of ${scores.length} game(s).`
    );
    err.statusCode = 400;
    throw err;
  }

  return {
    valid: true,
    computedWinner,
    teamAGamesWon,
    teamBGamesWon,
  };
};

/**
 * @desc    Submit a new match result (creates PENDING_APPROVAL match)
 * @route   POST /api/matches/submit
 * @access  Private (Authenticated Player or Admin)
 */
const submitMatch = async (req, res, next) => {
  try {
    const { matchType, court, teamA, teamB, scores, winnerTeam, isTournament = false } = req.body;

    // Get current submitter's Player document
    const submitterPlayer = await getOrCreatePlayerProfile(req.user);
    const isAdmin = req.user.role === 'ADMIN';

    // Validate payload against PRD Section 6.2 rules
    await validateMatchPayload({
      matchType,
      court,
      teamA,
      teamB,
      scores,
      winnerTeam,
      submitterPlayerId: submitterPlayer._id,
      isAdmin,
    });

    // Generate atomic sequential Match ID: PH-M00001
    const seq = await Counter.getNextSequence('matchId');
    const matchId = `PH-M${String(seq).padStart(5, '0')}`;

    // Create Match in PENDING_APPROVAL status (DoD #2, #3)
    const newMatch = await Match.create({
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
      status: 'PENDING_APPROVAL',
      submittedBy: submitterPlayer._id,
    });

    const populatedMatch = await Match.findById(newMatch._id)
      .populate('teamA', 'playerId name currentRating category profilePhoto')
      .populate('teamB', 'playerId name currentRating category profilePhoto')
      .populate('submittedBy', 'playerId name');

    res.status(201).json({
      success: true,
      message: 'Match submitted successfully. Pending administrator verification.',
      data: populatedMatch,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current player's pending matches awaiting approval
 * @route   GET /api/matches/pending
 * @access  Private (Authenticated Player)
 */
const getPendingMatchesForPlayer = async (req, res, next) => {
  try {
    const player = await getOrCreatePlayerProfile(req.user);

    const pendingMatches = await Match.find({
      $or: [
        { teamA: player._id },
        { teamB: player._id },
        { submittedBy: player._id },
      ],
      status: 'PENDING_APPROVAL',
    })
      .populate('teamA', 'playerId name currentRating category profilePhoto')
      .populate('teamB', 'playerId name currentRating category profilePhoto')
      .populate('submittedBy', 'playerId name')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: pendingMatches.length,
      data: pendingMatches,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current player's approved match history
 * @route   GET /api/matches/my-history
 * @access  Private (Authenticated Player)
 */
const getPlayerMatchHistory = async (req, res, next) => {
  try {
    const player = await getOrCreatePlayerProfile(req.user);
    const { limit = 20, page = 1 } = req.query;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = Math.min(parseInt(limit, 10) || 20, 50);
    const skip = (pageNum - 1) * limitNum;

    const query = {
      $or: [{ teamA: player._id }, { teamB: player._id }],
      status: 'APPROVED',
    };

    const [matches, total] = await Promise.all([
      Match.find(query)
        .populate('teamA', 'playerId name currentRating category profilePhoto')
        .populate('teamB', 'playerId name currentRating category profilePhoto')
        .populate('approvedBy', 'email')
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Match.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      count: matches.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      data: matches,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get match details by matchId or _id
 * @route   GET /api/matches/:id
 * @access  Private (Authenticated User)
 */
const getMatchById = async (req, res, next) => {
  try {
    const { id } = req.params;
    let match = null;

    if (/^PH-M\d{5}$/i.test(id)) {
      match = await Match.findOne({ matchId: id.toUpperCase() });
    } else if (mongoose.Types.ObjectId.isValid(id)) {
      match = await Match.findById(id);
    }

    if (!match) {
      return res.status(404).json({
        success: false,
        message: `Match '${id}' not found.`,
      });
    }

    await match.populate('teamA', 'playerId name currentRating category profilePhoto');
    await match.populate('teamB', 'playerId name currentRating category profilePhoto');
    await match.populate('submittedBy', 'playerId name');
    if (match.approvedBy) {
      await match.populate('approvedBy', 'email role');
    }

    res.status(200).json({
      success: true,
      data: match,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  validateMatchPayload,
  submitMatch,
  getPendingMatchesForPlayer,
  getPlayerMatchHistory,
  getMatchById,
};
