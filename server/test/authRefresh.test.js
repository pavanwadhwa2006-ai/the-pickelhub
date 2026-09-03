/**
 * Dual-Token Authentication & Refresh Test Suite
 *
 * Verifies:
 * 1. Token generation: generateToken (access) & generateRefreshToken (refresh)
 * 2. Token segregation: access token cannot be verified as refresh token & vice versa
 * 3. Token verification: valid signatures pass, invalid/tampered signatures fail
 * 4. Cookie maxAge helper: getRefreshCookieMaxAge returns correct ms values
 * 5. Controller refresh handler:
 *    - Rejects request with 401 when no cookie is present
 *    - Rejects request with 401 and clears cookie when token is invalid
 *    - Issues new access token and user payload when valid refresh token is present
 * 6. Controller logout handler:
 *    - Clears picklehub_refresh cookie
 * 7. Controller login/register:
 *    - Sets picklehub_refresh cookie with httpOnly: true
 *
 * Run: node --test test/authRefresh.test.js
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load environment config
const envPath = path.resolve(__dirname, '../.env');
const rootEnvPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });
dotenv.config({ path: rootEnvPath });

const User = require('../src/models/User');
const Player = require('../src/models/Player');
const {
  generateToken,
  generateRefreshToken,
  verifyToken,
  verifyRefreshToken,
  getRefreshCookieMaxAge,
} = require('../src/services/authService');
const { refresh, logout, login, register } = require('../src/controllers/authController');

describe('Dual-Token JWT & httpOnly Refresh Cookie Suite', () => {
  let testUser;
  const createdUserIds = [];
  const createdPlayerIds = [];

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
    }

    const timestamp = Date.now();
    testUser = await User.create({
      email: `refresh_test_${timestamp}@picklehub.test`,
      password: 'Password123!',
      role: 'PLAYER',
    });
    createdUserIds.push(testUser._id);
  });

  after(async () => {
    if (createdUserIds.length > 0) {
      await User.deleteMany({ _id: { $in: createdUserIds } });
    }
    if (createdPlayerIds.length > 0) {
      await Player.deleteMany({ _id: { $in: createdPlayerIds } });
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  describe('1. Dual-Token Generation and Cryptographic Segregation', () => {
    it('should generate an access token with type: access and role', () => {
      const accessToken = generateToken(testUser._id, testUser.role);
      assert.ok(accessToken);
      const decoded = verifyToken(accessToken);
      assert.equal(decoded.id, testUser._id.toString());
      assert.equal(decoded.role, 'PLAYER');
      assert.equal(decoded.type, 'access');
    });

    it('should generate a refresh token with type: refresh', () => {
      const refreshToken = generateRefreshToken(testUser._id);
      assert.ok(refreshToken);
      const decoded = verifyRefreshToken(refreshToken);
      assert.equal(decoded.id, testUser._id.toString());
      assert.equal(decoded.type, 'refresh');
    });

    it('should fail when verifying a refresh token with verifyToken (access secret)', () => {
      const refreshToken = generateRefreshToken(testUser._id);
      assert.throws(() => {
        verifyToken(refreshToken);
      });
    });

    it('should fail when verifying an access token with verifyRefreshToken (refresh secret)', () => {
      const accessToken = generateToken(testUser._id, testUser.role);
      assert.throws(() => {
        verifyRefreshToken(accessToken);
      });
    });

    it('should correctly parse duration strings in getRefreshCookieMaxAge', () => {
      const maxAge = getRefreshCookieMaxAge();
      assert.ok(typeof maxAge === 'number');
      assert.ok(maxAge > 0);
      assert.equal(maxAge, 7 * 24 * 60 * 60 * 1000); // 7d default
    });
  });

  describe('2. Refresh Controller Endpoint (POST /api/auth/refresh)', () => {
    it('should return 401 when no picklehub_refresh cookie is present', async () => {
      const req = { cookies: {} };
      let statusCode = 0;
      let responseBody = null;
      const res = {
        status: (code) => {
          statusCode = code;
          return {
            json: (body) => {
              responseBody = body;
            },
          };
        },
      };

      await refresh(req, res);

      assert.equal(statusCode, 401);
      assert.equal(responseBody.success, false);
      assert.match(responseBody.message, /no refresh token/i);
    });

    it('should return 401 and clear cookie when refresh token is invalid', async () => {
      const req = { cookies: { picklehub_refresh: 'tampered.token.value' } };
      let statusCode = 0;
      let responseBody = null;
      let cookieCleared = false;
      const res = {
        status: (code) => {
          statusCode = code;
          return {
            json: (body) => {
              responseBody = body;
            },
          };
        },
        clearCookie: (name) => {
          if (name === 'picklehub_refresh') cookieCleared = true;
        },
      };

      await refresh(req, res);

      assert.equal(statusCode, 401);
      assert.equal(responseBody.success, false);
      assert.equal(cookieCleared, true);
    });

    it('should return a new access token and user data when valid refresh token is provided', async () => {
      const validRefreshToken = generateRefreshToken(testUser._id);
      const req = { cookies: { picklehub_refresh: validRefreshToken } };
      let statusCode = 0;
      let responseBody = null;
      const res = {
        status: (code) => {
          statusCode = code;
          return {
            json: (body) => {
              responseBody = body;
            },
          };
        },
      };

      await refresh(req, res);

      assert.equal(statusCode, 200);
      assert.equal(responseBody.success, true);
      assert.ok(responseBody.token, 'Should return new access token');
      assert.equal(responseBody.user.id.toString(), testUser._id.toString());
      assert.equal(responseBody.user.role, 'PLAYER');

      // Verify the new token is a valid access token
      const decoded = verifyToken(responseBody.token);
      assert.equal(decoded.id, testUser._id.toString());
      assert.equal(decoded.type, 'access');
    });
  });

  describe('3. Logout Controller Endpoint (POST /api/auth/logout)', () => {
    it('should clear picklehub_refresh cookie with correct path on logout', async () => {
      const req = {};
      let cookieCleared = false;
      let clearedOptions = null;
      let statusCode = 0;
      let responseBody = null;

      const res = {
        clearCookie: (name, options) => {
          if (name === 'picklehub_refresh') {
            cookieCleared = true;
            clearedOptions = options;
          }
        },
        status: (code) => {
          statusCode = code;
          return {
            json: (body) => {
              responseBody = body;
            },
          };
        },
      };

      await logout(req, res);

      assert.equal(statusCode, 200);
      assert.equal(responseBody.success, true);
      assert.equal(cookieCleared, true);
      assert.equal(clearedOptions.httpOnly, true);
      assert.equal(clearedOptions.path, '/api/auth');
    });
  });

  describe('4. Login & Register Set httpOnly Cookie', () => {
    it('should set httpOnly picklehub_refresh cookie upon successful login', async () => {
      const req = {
        body: {
          email: testUser.email,
          password: 'Password123!',
        },
      };

      let cookieSet = false;
      let cookieName = null;
      let cookieValue = null;
      let cookieOptions = null;
      let statusCode = 0;
      let responseBody = null;

      const res = {
        cookie: (name, value, options) => {
          cookieSet = true;
          cookieName = name;
          cookieValue = value;
          cookieOptions = options;
        },
        status: (code) => {
          statusCode = code;
          return {
            json: (body) => {
              responseBody = body;
            },
          };
        },
      };

      await login(req, res, (err) => { throw err; });

      assert.equal(statusCode, 200);
      assert.equal(responseBody.success, true);
      assert.ok(responseBody.token);
      assert.equal(cookieSet, true);
      assert.equal(cookieName, 'picklehub_refresh');
      assert.ok(cookieValue);
      assert.equal(cookieOptions.httpOnly, true);
      assert.equal(cookieOptions.path, '/api/auth');

      // Verify the cookie value is indeed a valid refresh token
      const decoded = verifyRefreshToken(cookieValue);
      assert.equal(decoded.id, testUser._id.toString());
      assert.equal(decoded.type, 'refresh');
    });

    it('should set httpOnly picklehub_refresh cookie upon successful registration', async () => {
      const regTimestamp = Date.now() + 1;
      const regEmail = `reg_refresh_${regTimestamp}@picklehub.test`;
      const req = {
        body: {
          email: regEmail,
          password: 'Password123!',
          name: 'Refresh Register Test',
        },
      };

      let cookieSet = false;
      let cookieName = null;
      let cookieValue = null;
      let cookieOptions = null;
      let statusCode = 0;
      let responseBody = null;

      const res = {
        cookie: (name, value, options) => {
          cookieSet = true;
          cookieName = name;
          cookieValue = value;
          cookieOptions = options;
        },
        status: (code) => {
          statusCode = code;
          return {
            json: (body) => {
              responseBody = body;
            },
          };
        },
      };

      await register(req, res, (err) => { throw err; });

      assert.equal(statusCode, 201);
      assert.equal(responseBody.success, true);
      assert.ok(responseBody.token);
      assert.equal(cookieSet, true);
      assert.equal(cookieName, 'picklehub_refresh');
      assert.equal(cookieOptions.httpOnly, true);

      createdUserIds.push(responseBody.user.id);
      if (responseBody.player?._id) {
        createdPlayerIds.push(responseBody.player._id);
      }
    });
  });
});
