/**
 * Auth Controller
 *
 * Handles user registration, login with lockout protection, logout, token refresh, and profile retrieval.
 * Implements dual-token architecture:
 * - Access Token (15m) returned in JSON body, stored in-memory on client
 * - Refresh Token (7d) set as httpOnly cookie, used only to mint new access tokens
 */

const User = require('../models/User');
const {
  generateToken,
  generateRefreshToken,
  verifyRefreshToken,
  verifyGoogleToken,
  getRefreshCookieMaxAge,
} = require('../services/authService');
const { createPlayerProfile, getOrCreatePlayerProfile } = require('../services/playerService');
const { NODE_ENV } = require('../config/env');

/**
 * Helper: Set refresh token as httpOnly cookie
 */
const setRefreshCookie = (res, refreshToken) => {
  res.cookie('picklehub_refresh', refreshToken, {
    httpOnly: true,
    secure: NODE_ENV === 'production',
    sameSite: NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: getRefreshCookieMaxAge(),
    path: '/api/auth', // only sent to auth routes
  });
};

/**
 * Helper: Clear refresh token cookie
 */
const clearRefreshCookie = (res) => {
  res.clearCookie('picklehub_refresh', {
    httpOnly: true,
    secure: NODE_ENV === 'production',
    sameSite: NODE_ENV === 'production' ? 'strict' : 'lax',
    path: '/api/auth',
  });
};

/**
 * @desc    Register a new user & auto-create player profile
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res, next) => {
  try {
    const { email, password, role, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.',
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists.',
      });
    }

    // Create user
    const user = await User.create({
      email: email.toLowerCase().trim(),
      password,
      role: role && ['PLAYER', 'ADMIN'].includes(role.toUpperCase()) ? role.toUpperCase() : 'PLAYER',
    });

    // Auto-create linked Player profile
    let player = null;
    try {
      player = await createPlayerProfile({
        userId: user._id,
        email: user.email,
        name: name || user.email.split('@')[0],
      });
    } catch (playerErr) {
      console.error('Failed to create player profile on registration:', playerErr.message);
      // Lazy repair will handle profile creation if needed
    }

    const accessToken = generateToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);

    setRefreshCookie(res, refreshToken);

    res.status(201).json({
      success: true,
      message: 'Registration successful.',
      token: accessToken,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
      player,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Authenticate user & get token
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.',
      });
    }

    // Find user by email and explicitly select password
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Check if account is locked
    if (user.isLocked()) {
      const minutesRemaining = Math.ceil((user.lockedUntil - Date.now()) / 60000);
      return res.status(423).json({
        success: false,
        message: `Account is temporarily locked due to consecutive failed login attempts. Please try again in ${minutesRemaining} minute(s).`,
      });
    }

    // Check password match
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      await user.handleFailedLogin();

      if (user.isLocked()) {
        return res.status(423).json({
          success: false,
          message: 'Account locked due to 5 consecutive failed login attempts. Please try again in 15 minutes.',
        });
      }

      const remainingAttempts = 5 - user.failedLoginAttempts;
      return res.status(401).json({
        success: false,
        message: `Invalid email or password. ${remainingAttempts} attempt(s) remaining before lockout.`,
      });
    }

    // Reset failed attempts upon successful login
    await user.handleSuccessfulLogin();

    const accessToken = generateToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);
    const player = await getOrCreatePlayerProfile(user);

    setRefreshCookie(res, refreshToken);

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      token: accessToken,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
      player,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Authenticate or register user via Google OAuth credential
 * @route   POST /api/auth/google
 * @access  Public
 */
const googleAuth = async (req, res, _next) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        success: false,
        message: 'Google credential token is required.',
      });
    }

    const payload = await verifyGoogleToken(credential);
    const { googleId, email, name, picture } = payload;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Google account does not have a verified email.',
      });
    }

    // Check if user exists by googleId or email
    let user = await User.findOne({
      $or: [{ googleId }, { email: email.toLowerCase().trim() }],
    });

    if (user) {
      // If user exists, link googleId if missing and clear any lockouts
      let modified = false;
      if (!user.googleId) {
        user.googleId = googleId;
        modified = true;
      }
      if (user.failedLoginAttempts > 0 || user.lockedUntil) {
        user.failedLoginAttempts = 0;
        user.lockedUntil = null;
        modified = true;
      }
      if (modified) {
        await user.save({ validateBeforeSave: false });
      }
    } else {
      // Create new user authenticated via Google
      user = await User.create({
        email: email.toLowerCase().trim(),
        googleId,
        authProvider: 'google',
        role: 'PLAYER',
      });
    }

    // Retrieve or auto-create linked Player profile
    const player = await getOrCreatePlayerProfile(user);

    // If new player profile or default name/empty photo, update with Google details
    if (player && (player.name === user.email.split('@')[0] || !player.profilePhoto)) {
      let playerUpdated = false;
      if (name && player.name === user.email.split('@')[0]) {
        player.name = name;
        playerUpdated = true;
      }
      if (picture && !player.profilePhoto) {
        player.profilePhoto = picture;
        playerUpdated = true;
      }
      if (playerUpdated) {
        await player.save();
      }
    }

    const accessToken = generateToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);

    setRefreshCookie(res, refreshToken);

    res.status(200).json({
      success: true,
      message: 'Google authentication successful.',
      token: accessToken,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
      player,
    });
  } catch (error) {
    console.error('Google Auth Error:', error.message);
    return res.status(401).json({
      success: false,
      message: 'Google authentication failed. ' + (error.message || 'Invalid token.'),
    });
  }
};

/**
 * @desc    Log out user — clear refresh cookie
 * @route   POST /api/auth/logout
 * @access  Public
 */
const logout = async (req, res) => {
  clearRefreshCookie(res);
  res.status(200).json({
    success: true,
    message: 'Logged out successfully.',
  });
};

/**
 * @desc    Refresh access token using httpOnly refresh cookie
 * @route   POST /api/auth/refresh
 * @access  Public (cookie required)
 */
const refresh = async (req, res) => {
  try {
    const refreshCookie = req.cookies?.picklehub_refresh;

    if (!refreshCookie) {
      return res.status(401).json({
        success: false,
        message: 'No refresh token provided.',
      });
    }

    const decoded = verifyRefreshToken(refreshCookie);

    // Fetch the user to get current role (in case of promotion since last login)
    const user = await User.findById(decoded.id);
    if (!user) {
      clearRefreshCookie(res);
      return res.status(401).json({
        success: false,
        message: 'User not found.',
      });
    }

    const accessToken = generateToken(user._id, user.role);
    const player = await getOrCreatePlayerProfile(user);

    res.status(200).json({
      success: true,
      token: accessToken,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
      player,
    });
  } catch (error) {
    clearRefreshCookie(res);
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired refresh token. Please log in again.',
    });
  }
};

/**
 * @desc    Get current authenticated user profile & linked player
 * @route   GET /api/auth/me
 * @access  Private (Protected)
 */
const getMe = async (req, res, next) => {
  try {
    const player = await getOrCreatePlayerProfile(req.user);

    res.status(200).json({
      success: true,
      user: {
        id: req.user._id,
        email: req.user.email,
        role: req.user.role,
        createdAt: req.user.createdAt,
      },
      player,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  googleAuth,
  logout,
  refresh,
  getMe,
};
