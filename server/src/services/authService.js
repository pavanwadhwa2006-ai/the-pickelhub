/**
 * Authentication Service
 *
 * Handles JWT token generation and verification.
 * Implements dual-token architecture:
 * - Access Token (short-lived, 15m default) — sent in JSON, stored in-memory on client
 * - Refresh Token (long-lived, 7d default) — stored in httpOnly cookie
 */

const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const {
  JWT_SECRET,
  REFRESH_TOKEN_SECRET,
  ACCESS_TOKEN_EXPIRY,
  REFRESH_TOKEN_EXPIRY,
  JWT_EXPIRES_IN,
  GOOGLE_CLIENT_ID,
} = require('../config/env');

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

/**
 * Generate a signed access token for an authenticated user
 * Short-lived (default 15m), stored in-memory on client
 * @param {string} userId - User ObjectId
 * @param {string} role - User role ('PLAYER' | 'ADMIN')
 * @returns {string} Signed JWT access token
 */
const generateToken = (userId, role) => {
  let expiry = ACCESS_TOKEN_EXPIRY || JWT_EXPIRES_IN || '15m';
  if (typeof expiry === 'number' || /^\d+$/.test(expiry)) {
    expiry = `${expiry}m`;
  }
  return jwt.sign({ id: userId, role, type: 'access' }, JWT_SECRET, {
    expiresIn: expiry,
  });
};

/**
 * Generate a signed refresh token for an authenticated user
 * Long-lived (default 7d), stored in httpOnly cookie
 * @param {string} userId - User ObjectId
 * @returns {string} Signed JWT refresh token
 */
const generateRefreshToken = (userId) => {
  let expiry = REFRESH_TOKEN_EXPIRY || '7d';
  if (typeof expiry === 'number' || /^\d+$/.test(expiry)) {
    expiry = `${expiry}d`;
  }
  return jwt.sign({ id: userId, type: 'refresh' }, REFRESH_TOKEN_SECRET, {
    expiresIn: expiry,
  });
};

/**
 * Verify an access token
 * @param {string} token
 * @returns {object} Decoded token payload
 */
const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET, { clockTolerance: 60 });
};

/**
 * Verify a refresh token
 * @param {string} token
 * @returns {object} Decoded token payload
 */
const verifyRefreshToken = (token) => {
  return jwt.verify(token, REFRESH_TOKEN_SECRET, { clockTolerance: 60 });
};

/**
 * Verify Google ID Token
 * @param {string} idToken
 * @returns {Promise<{ googleId: string, email: string, name: string, picture: string, emailVerified: boolean }>}
 */
const verifyGoogleToken = async (idToken) => {
  if (!idToken) {
    throw new Error('No Google ID token provided');
  }

  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: GOOGLE_CLIENT_ID || undefined,
  });

  const payload = ticket.getPayload();
  if (!payload) {
    throw new Error('Invalid Google token payload');
  }

  return {
    googleId: payload.sub,
    email: payload.email,
    name: payload.name,
    picture: payload.picture,
    emailVerified: payload.email_verified,
  };
};

/**
 * Parse REFRESH_TOKEN_EXPIRY into milliseconds for cookie maxAge
 * @returns {number} maxAge in milliseconds
 */
const getRefreshCookieMaxAge = () => {
  const expiry = REFRESH_TOKEN_EXPIRY || '7d';
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000; // default 7 days
  const value = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return 7 * 24 * 60 * 60 * 1000;
  }
};

module.exports = {
  generateToken,
  generateRefreshToken,
  verifyToken,
  verifyRefreshToken,
  verifyGoogleToken,
  getRefreshCookieMaxAge,
};
