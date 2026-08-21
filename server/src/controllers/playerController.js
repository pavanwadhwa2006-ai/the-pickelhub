/**
 * Player Controller
 *
 * Handles player directory queries, leaderboard standings, specialty leaders,
 * head-to-head comparisons, profile lookups, and player updates.
 */

const mongoose = require('mongoose');
const Player = require('../models/Player');
const Match = require('../models/Match');
const { getOrCreatePlayerProfile } = require('../services/playerService');
const { calculateExpectedScore } = require('../services/ratingService');

// Public projection to prevent email/private data leakage (Point #6)
const PUBLIC_PLAYER_FIELDS =
  'playerId name profilePhoto currentRating highestRating category matchesPlayed wins losses winPercentage winningStreak tournamentWins tournamentAppearances accountStatus createdAt';

/**
 * Helper to resolve player by either PlayerId (PH-XXXXX) or ObjectId
 */
const resolvePlayer = async (identifier) => {
  if (!identifier) return null;
  const clean = identifier.toString().trim();
  if (/^PH-\d{5}$/i.test(clean)) {
    return await Player.findOne({ playerId: clean.toUpperCase(), accountStatus: 'ACTIVE' }).select(
      PUBLIC_PLAYER_FIELDS
    );
  } else if (mongoose.Types.ObjectId.isValid(clean)) {
    return await Player.findOne({ _id: clean, accountStatus: 'ACTIVE' }).select(
      PUBLIC_PLAYER_FIELDS
    );
  }
  return null;
};

/**
 * @desc    Get active players (leaderboard/directory with search and filters)
 * @route   GET /api/players
 * @access  Public
 */
const getPlayers = async (req, res, next) => {
  try {
    const { category, page = 1, limit = 25, sort = 'rating', q, search } = req.query;

    const query = {
      accountStatus: 'ACTIVE', // Only active players (PRD Section 8.2 & 8.3)
    };

    // Category filter
    if (category && category !== 'ALL') {
      query.category = category.toLowerCase();
    }

    // Search query filter (name, playerId)
    const searchTerm = q || search;
    if (searchTerm && searchTerm.trim().length > 0) {
      const cleanSearch = searchTerm.trim();
      query.$or = [
        { name: { $regex: cleanSearch, $options: 'i' } },
        { playerId: { $regex: cleanSearch, $options: 'i' } },
      ];
    }

    // Multi-sort options
    const sortOptions = {};
    if (sort === 'rating') {
      sortOptions.currentRating = -1;
      sortOptions.wins = -1;
    } else if (sort === 'wins') {
      sortOptions.wins = -1;
      sortOptions.currentRating = -1;
    } else if (sort === 'winRate' || sort === 'winPercentage') {
      sortOptions.winPercentage = -1;
      sortOptions.matchesPlayed = -1;
      sortOptions.currentRating = -1;
    } else if (sort === 'streak') {
      sortOptions.winningStreak = -1;
      sortOptions.currentRating = -1;
    } else if (sort === 'matches') {
      sortOptions.matchesPlayed = -1;
      sortOptions.currentRating = -1;
    } else {
      sortOptions.currentRating = -1;
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = Math.min(parseInt(limit, 10) || 25, 100);
    const skip = (pageNum - 1) * limitNum;

    const [players, total] = await Promise.all([
      Player.find(query)
        .select(PUBLIC_PLAYER_FIELDS)
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum),
      Player.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      count: players.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      data: players,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get specialty leader blocks (PRD Section 8.2)
 * @route   GET /api/players/leaders
 * @access  Public
 */
const getLeaderboardSpecialties = async (req, res, next) => {
  try {
    const activeCondition = { accountStatus: 'ACTIVE' };

    const [highestRated, mostWins, highestWinRate, longestStreak] = await Promise.all([
      // 1. Highest Rated Player
      Player.findOne(activeCondition).select(PUBLIC_PLAYER_FIELDS).sort({ currentRating: -1, wins: -1 }),

      // 2. Most Wins
      Player.findOne(activeCondition).select(PUBLIC_PLAYER_FIELDS).sort({ wins: -1, currentRating: -1 }),

      // 3. Highest Win % (minimum 5 matches played per PRD Section 8.2)
      Player.findOne({ ...activeCondition, matchesPlayed: { $gte: 5 } })
        .select(PUBLIC_PLAYER_FIELDS)
        .sort({ winPercentage: -1, matchesPlayed: -1, currentRating: -1 }),

      // 4. Longest Active Winning Streak
      Player.findOne(activeCondition)
        .select(PUBLIC_PLAYER_FIELDS)
        .sort({ winningStreak: -1, currentRating: -1 }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        highestRated: highestRated || null,
        mostWins: mostWins || null,
        highestWinRate: highestWinRate || null,
        longestStreak: longestStreak || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Head-to-Head Player Comparison (PRD Section 11.2 & DoD)
 * @route   GET /api/players/compare?p1=...&p2=...
 * @access  Public
 */
const comparePlayers = async (req, res, next) => {
  try {
    const p1Id = req.query.p1 || req.query.player1;
    const p2Id = req.query.p2 || req.query.player2;

    if (!p1Id || !p2Id) {
      return res.status(400).json({
        success: false,
        message: 'Both player identifiers (p1 and p2) are required for head-to-head comparison.',
      });
    }

    if (p1Id === p2Id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot compare a player against themselves. Select two distinct players.',
      });
    }

    const [player1, player2] = await Promise.all([resolvePlayer(p1Id), resolvePlayer(p2Id)]);

    if (!player1 || !player2) {
      return res.status(404).json({
        success: false,
        message: 'One or both player profiles could not be found or are inactive.',
      });
    }

    // Fetch approved head-to-head matches between player 1 and player 2
    const h2hMatches = await Match.find({
      status: 'APPROVED',
      $or: [
        { teamA: player1._id, teamB: player2._id },
        { teamA: player2._id, teamB: player1._id },
      ],
    })
      .select('matchId matchType date scores winnerTeam teamA teamB')
      .sort({ date: -1 })
      .limit(20);

    let player1Wins = 0;
    let player2Wins = 0;

    h2hMatches.forEach((m) => {
      const p1IsTeamA = m.teamA.some((id) => id.toString() === player1._id.toString());
      const winningSide = m.winnerTeam; // 'A' or 'B'
      if ((p1IsTeamA && winningSide === 'A') || (!p1IsTeamA && winningSide === 'B')) {
        player1Wins++;
      } else {
        player2Wins++;
      }
    });

    // Compute algorithmic expected win probabilities using rating engine
    const p1ExpectedScore = calculateExpectedScore(player1.currentRating, player2.currentRating);
    const p2ExpectedScore = calculateExpectedScore(player2.currentRating, player1.currentRating);

    const ratingGap = player1.currentRating - player2.currentRating;

    res.status(200).json({
      success: true,
      data: {
        player1,
        player2,
        headToHead: {
          totalMatches: h2hMatches.length,
          player1Wins,
          player2Wins,
          matches: h2hMatches,
        },
        analytics: {
          ratingGap,
          player1WinProbability: Math.round(p1ExpectedScore * 100),
          player2WinProbability: Math.round(p2ExpectedScore * 100),
          higherRatedPlayer:
            ratingGap > 0
              ? player1.name
              : ratingGap < 0
              ? player2.name
              : 'Equal Rating',
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single player profile by ObjectId or PlayerId (e.g. PH-00001)
 * @route   GET /api/players/:id
 * @access  Public
 */
const getPlayerById = async (req, res, next) => {
  try {
    const { id } = req.params;
    let player = null;

    if (/^PH-\d{5}$/i.test(id)) {
      player = await Player.findOne({ playerId: id.toUpperCase() }).select(PUBLIC_PLAYER_FIELDS);
    } else if (mongoose.Types.ObjectId.isValid(id)) {
      player = await Player.findById(id).select(PUBLIC_PLAYER_FIELDS);
    }

    if (!player) {
      return res.status(404).json({
        success: false,
        message: `Player with identifier '${id}' not found.`,
      });
    }

    res.status(200).json({
      success: true,
      data: player,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current authenticated player profile
 * @route   GET /api/players/me
 * @access  Private (Protected)
 */
const getMyPlayerProfile = async (req, res, next) => {
  try {
    const player = await getOrCreatePlayerProfile(req.user);

    res.status(200).json({
      success: true,
      data: player,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update current player's profile (name, photo)
 * @route   PUT /api/players/me
 * @access  Private (Protected)
 */
const updateMyProfile = async (req, res, next) => {
  try {
    const { name, profilePhoto } = req.body;
    const player = await getOrCreatePlayerProfile(req.user);

    if (name && name.trim().length > 0) {
      player.name = name.trim();
    }

    if (typeof profilePhoto === 'string') {
      player.profilePhoto = profilePhoto.trim();
    }

    await player.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: player,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Search active players for match submission autocomplete
 * @route   GET /api/players/search?query=...
 * @access  Public
 */
const searchPlayers = async (req, res, next) => {
  try {
    const query = req.query.q || req.query.query;

    if (!query || query.trim().length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
      });
    }

    const cleanQuery = query.trim();
    const isPlayerIdSearch = /^PH-\d{1,5}$/i.test(cleanQuery);

    const searchCondition = isPlayerIdSearch
      ? { playerId: { $regex: cleanQuery, $options: 'i' } }
      : {
          $or: [
            { name: { $regex: cleanQuery, $options: 'i' } },
            { playerId: { $regex: cleanQuery, $options: 'i' } },
            { email: { $regex: cleanQuery, $options: 'i' } },
          ],
        };

    const players = await Player.find({
      ...searchCondition,
      accountStatus: 'ACTIVE', // Suspended players excluded (PRD Section 8.3)
    })
      .select('playerId name profilePhoto currentRating category') // Sanitized projection, no email (Point #6)
      .limit(15);

    res.status(200).json({
      success: true,
      count: players.length,
      data: players,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPlayers,
  getLeaderboardSpecialties,
  comparePlayers,
  getPlayerById,
  getMyPlayerProfile,
  updateMyProfile,
  searchPlayers,
};
