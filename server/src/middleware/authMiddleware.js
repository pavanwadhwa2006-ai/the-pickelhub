/**
 * Authentication & Authorization Middleware
 *
 * Protects routes requiring authentication and enforces role-based access control.
 */

const User = require('../models/User');
const { verifyToken } = require('../services/authService');

/**
 * Protect routes: verifies Bearer JWT and attaches req.user
 */
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized. Please log in to access this resource.',
    });
  }

  try {
    const decoded = verifyToken(token);

    // Fetch user without password
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'The user belonging to this token no longer exists.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token. Please log in again.',
      error: error.message,
    });
  }
};

/**
 * Role authorization guard
 * @param  {...string} roles - e.g. 'ADMIN', 'PLAYER'
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: User role '${req.user ? req.user.role : 'UNKNOWN'}' is not authorized to access this route.`,
      });
    }
    next();
  };
};

module.exports = {
  protect,
  authorize,
};
