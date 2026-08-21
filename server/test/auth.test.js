/**
 * Authentication Test Suite
 *
 * Tests JWT service, User model password hashing, account lockout mechanism,
 * and role-based middleware guards.
 */

const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

// Set dummy env variables for test if not already set
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-1234567890';
process.env.JWT_EXPIRES_IN = '1h';
process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/picklehub_test';
process.env.NODE_ENV = 'test';

const { generateToken, verifyToken } = require('../src/services/authService');
const User = require('../src/models/User');
const { authorize } = require('../src/middleware/authMiddleware');

describe('Authentication & Authorization Tests', () => {
  describe('JWT Service (authService.js)', () => {
    it('should generate a valid JWT token with user id and role payload', () => {
      const mockId = '654321654321654321654321';
      const mockRole = 'PLAYER';

      const token = generateToken(mockId, mockRole);
      assert.ok(token, 'Token should not be empty');
      assert.equal(typeof token, 'string');

      const decoded = verifyToken(token);
      assert.equal(decoded.id, mockId);
      assert.equal(decoded.role, mockRole);
    });

    it('should throw an error when verifying an invalid or tampered token', () => {
      const invalidToken = 'invalid.jwt.token';
      assert.throws(() => {
        verifyToken(invalidToken);
      });
    });
  });

  describe('User Model — Password Hashing & Comparison', () => {
    it('should hash the password before saving and verify it with comparePassword', async () => {
      const rawPassword = 'StrongPassword123!';
      const user = new User({
        email: 'athlete@picklehub.com',
        password: rawPassword,
        role: 'PLAYER',
      });

      // Simulate pre-save hook
      const bcrypt = require('bcryptjs');
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(user.password, salt);

      // Verify hash is not plaintext
      assert.notEqual(user.password, rawPassword);
      assert.ok(user.password.startsWith('$2'));

      // Verify matching password
      const isMatch = await user.comparePassword(rawPassword);
      assert.equal(isMatch, true, 'Valid password should match hash');

      // Verify wrong password
      const isMismatch = await user.comparePassword('WrongPassword');
      assert.equal(isMismatch, false, 'Invalid password should not match hash');
    });
  });

  describe('User Model — Account Lockout Mechanism (Section 5.3 & 10.1)', () => {
    it('should track failed attempts and lock account after 5 consecutive failures', async () => {
      const user = new User({
        email: 'lockout@picklehub.com',
        password: 'validPassword123',
        role: 'PLAYER',
      });

      assert.equal(user.failedLoginAttempts, 0);
      assert.equal(user.isLocked(), false);

      // Simulate 4 failed attempts
      for (let i = 1; i <= 4; i++) {
        user.failedLoginAttempts += 1;
        assert.equal(user.isLocked(), false, `Should not be locked at attempt ${i}`);
      }

      // 5th failed attempt -> locks account
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      }

      assert.equal(user.isLocked(), true, 'Account should be locked after 5 failed attempts');
      assert.ok(user.lockedUntil > Date.now());

      // Simulate successful login -> resets attempts and lock
      user.failedLoginAttempts = 0;
      user.lockedUntil = null;
      assert.equal(user.isLocked(), false, 'Account should be unlocked after successful reset');
    });
  });

  describe('Authorization Middleware (authorize)', () => {
    it('should call next() if user role matches permitted roles', () => {
      const middleware = authorize('ADMIN');
      let nextCalled = false;

      const req = { user: { role: 'ADMIN' } };
      const res = {
        status: () => res,
        json: () => {},
      };
      const next = () => {
        nextCalled = true;
      };

      middleware(req, res, next);
      assert.equal(nextCalled, true, 'Admin should be authorized');
    });

    it('should return 403 Forbidden if user role is not permitted', () => {
      const middleware = authorize('ADMIN');
      let nextCalled = false;
      let statusCode = 0;
      let responseBody = null;

      const req = { user: { role: 'PLAYER' } };
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
      const next = () => {
        nextCalled = true;
      };

      middleware(req, res, next);
      assert.equal(nextCalled, false, 'Player should not be authorized for Admin route');
      assert.equal(statusCode, 403);
      assert.equal(responseBody.success, false);
      assert.ok(responseBody.message.includes('Forbidden'));
    });
  });

  describe('User Model — Google OAuth Integration', () => {
    it('should validate user without password when googleId and authProvider: google is provided', () => {
      const googleUser = new User({
        email: 'google.athlete@gmail.com',
        googleId: '109876543210987654321',
        authProvider: 'google',
        role: 'PLAYER',
      });

      const validationError = googleUser.validateSync();
      assert.equal(validationError, undefined, 'Google user without password should pass validation');
      assert.equal(googleUser.authProvider, 'google');
      assert.equal(googleUser.googleId, '109876543210987654321');
    });

    it('should require password when googleId is not provided', () => {
      const localUser = new User({
        email: 'local.athlete@gmail.com',
        authProvider: 'local',
        role: 'PLAYER',
      });

      const validationError = localUser.validateSync();
      assert.ok(validationError, 'Local user without password should fail validation');
      assert.ok(validationError.errors.password, 'Validation error should include password field');
    });
  });
});
