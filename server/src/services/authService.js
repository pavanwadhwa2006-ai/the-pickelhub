/**
 * Authentication Service
 *
 * Handles JWT token generation and verification.
 */

const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { JWT_SECRET, JWT_EXPIRES_IN, GOOGLE_CLIENT_ID } = require('../config/env');

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

/**
 * Generate a signed JWT for an authenticated user
 * @param {string} userId - User ObjectId
 * @param {string} role - User role ('PLAYER' | 'ADMIN')
 * @returns {string} Signed JWT token
 */
const generateToken = (userId, role) => {
  return jwt.sign({ id: userId, role }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
};

/**
 * Verify a JWT token
 * @param {string} token
 * @returns {object} Decoded token payload
 */
const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
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

module.exports = {
  generateToken,
  verifyToken,
  verifyGoogleToken,
};
