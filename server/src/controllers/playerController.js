/**
 * Player Controller
 *
 * Handles player directory queries, profile retrievals,
 * search autocomplete, and player self-updates.
 */

const mongoose = require('mongoose');
const Player = require('../models/Player');
const { getOrCreatePlayerProfile } = require('../services/playerService');

// Public projection to prevent email/private data leakage (Point #6)
const PUBLIC_PLAYER_FIELDS = 'playerId name profilePhoto currentRating highestRating category matchesPlayed wins losses winningStreak tournamentWins tournamentAppearances accountStatus createdAt';

/**
 * @desc    Get active players (leaderboard/directory)
 * @route   GET /api/players
 * @access  Public
 */
const getPlayers = async (req, res, next) => {
  try {
    const { category, page = 1, limit = 20, sort = 'rating' } = req.query;

    const query = {
      accountStatus: 'ACTIVE', // Only active players (PRD Section 8.2 & 8.3)
    };

    if (category) {
      query.category = category;
    }

    const sortOptions = {};
    if (sort === 'rating') {
      sortOptions.currentRating = -1;
    } else if (sort === 'wins') {
      sortOptions.wins = -1;
    } else if (sort === 'streak') {
      sortOptions.winningStreak = -1;
    } else {
      sortOptions.currentRating = -1;
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = Math.min(parseInt(limit, 10) || 20, 100);
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
 * @desc    Get single player profile by ObjectId or PlayerId (e.g. PH-00001)
 * @route   GET /api/players/:id
 * @access  Public
 */
const getPlayerById = async (req, res, next) => {
  try {
    const { id } = req.params;
    let player = null;

    // Explicit tested branching: check PH-XXXXX format vs ObjectId (Point #5)
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
    const { query } = req.query;

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
  getPlayerById,
  getMyPlayerProfile,
  updateMyProfile,
  searchPlayers,
};
