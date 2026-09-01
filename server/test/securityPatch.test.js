/**
 * Security Patch & Privilege Escalation Test Suite — Master Plan v2
 *
 * Verifies:
 * 1. Privilege escalation protection: Non-admin calling /promote gets 403 Forbidden.
 * 2. Admin promotion execution: Admin promotes user, sets role: ADMIN, and creates AuditLog.
 * 3. Token lifecycle verification: Pre-promotion token still fails admin routes with 403;
 *    newly issued token post-promotion succeeds.
 * 4. Atomic MongoDB-backed Rate Limiter: 6th request within window gets 429 with numeric Retry-After header.
 * 5. NoSQL operator sanitizer: Strips $ and . operator keys from unauthenticated payloads.
 *
 * Run: node --test test/securityPatch.test.js
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
const AuditLog = require('../src/models/AuditLog');
const RateLimit = require('../src/models/RateLimit');
const { generateToken, verifyToken } = require('../src/services/authService');
const { authorize } = require('../src/middleware/authMiddleware');
const { createRateLimiter } = require('../src/middleware/rateLimiter');
const { sanitizeObject } = require('../src/middleware/sanitizer');
const { promoteUser } = require('../src/controllers/adminController');

describe('Security Hardening & Privilege Escalation — Master Plan v2', () => {
  let adminUser, playerUser, targetUser;
  let adminToken, playerToken;
  const createdUserIds = [];
  const createdPlayerIds = [];

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
    }

    const timestamp = Date.now();

    // 1. Create Admin User
    adminUser = await User.create({
      email: `sec_admin_${timestamp}@picklehub.test`,
      password: 'Password123!',
      role: 'ADMIN',
    });
    createdUserIds.push(adminUser._id);
    adminToken = generateToken(adminUser._id, adminUser.role);

    // 2. Create Regular Player User
    playerUser = await User.create({
      email: `sec_player_${timestamp}@picklehub.test`,
      password: 'Password123!',
      role: 'PLAYER',
    });
    createdUserIds.push(playerUser._id);
    playerToken = generateToken(playerUser._id, playerUser.role);

    // 3. Create Target User for promotion testing
    targetUser = await User.create({
      email: `sec_target_${timestamp}@picklehub.test`,
      password: 'Password123!',
      role: 'PLAYER',
    });
    createdUserIds.push(targetUser._id);
  });

  after(async () => {
    if (createdUserIds.length > 0) {
      await User.deleteMany({ _id: { $in: createdUserIds } });
      await AuditLog.deleteMany({ targetId: { $in: createdUserIds } });
    }
    if (createdPlayerIds.length > 0) {
      await Player.deleteMany({ _id: { $in: createdPlayerIds } });
    }
    await RateLimit.deleteMany({ key: /^test_rl:/ });
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  describe('1. Privilege Escalation Guard on /api/admin/users/:id/promote', () => {
    it('should reject non-admin users with 403 Forbidden via authorize middleware', () => {
      const authMiddleware = authorize('ADMIN');
      const req = { user: playerUser };
      let statusCode = 0;
      let responseBody = null;
      const res = {
        status: (code) => {
          statusCode = code;
          return {
            json: (data) => {
              responseBody = data;
            },
          };
        },
      };

      authMiddleware(req, res, () => {
        assert.fail('next() should not be called for non-admin');
      });

      assert.equal(statusCode, 403);
      assert.equal(responseBody.success, false);
    });

    it('should allow admin to promote user to ADMIN and record USER_ROLE_PROMOTE audit log', async () => {
      let statusCode = 0;
      let responseBody = null;
      const req = {
        params: { id: targetUser._id.toString() },
        user: adminUser,
      };
      const res = {
        status: (code) => {
          statusCode = code;
          return {
            json: (data) => {
              responseBody = data;
            },
          };
        },
      };

      await promoteUser(req, res, () => {});

      assert.equal(statusCode, 200);
      assert.equal(responseBody.success, true);
      assert.equal(responseBody.data.role, 'ADMIN');
      assert.ok(responseBody.message.includes('log in again'));

      // Verify User in DB updated to ADMIN
      const updated = await User.findById(targetUser._id);
      assert.equal(updated.role, 'ADMIN');

      // Verify AuditLog entry
      const audit = await AuditLog.findOne({
        targetId: targetUser._id,
        action: 'USER_ROLE_PROMOTE',
      });
      assert.ok(audit);
      assert.equal(audit.performedBy.toString(), adminUser._id.toString());
      assert.equal(audit.metadata.promotedRole, 'ADMIN');
    });
  });

  describe('2. Promoted User Token Lifecycle Verification', () => {
    it('should enforce that pre-promotion token still fails admin routes until re-authentication', () => {
      // Pre-promotion token generated when targetUser had PLAYER role
      const prePromotionToken = generateToken(targetUser._id, 'PLAYER');

      const decodedPre = verifyToken(prePromotionToken);
      assert.equal(decodedPre.role, 'PLAYER');

      // Middleware reading decoded pre-promotion token must reject with 403
      let statusCode = 0;
      const res = {
        status: (code) => {
          statusCode = code;
          return { json: () => {} };
        },
      };

      authorize('ADMIN')({ user: decodedPre }, res, () => {
        assert.fail('Pre-promotion token should not pass authorize(ADMIN)');
      });
      assert.equal(statusCode, 403);

      // Post-promotion token generated after user logged in again
      const postPromotionToken = generateToken(targetUser._id, 'ADMIN');
      const decodedPost = verifyToken(postPromotionToken);
      assert.equal(decodedPost.role, 'ADMIN');

      let calledNext = false;
      authorize('ADMIN')({ user: decodedPost }, res, () => {
        calledNext = true;
      });
      assert.equal(calledNext, true);
    });
  });

  describe('3. Atomic MongoDB-Backed Rate Limiter (5 Requests / 15 Min Window)', () => {
    it('should allow 5 requests and reject the 6th with 429 Too Many Requests and Retry-After header', async () => {
      // Temporarily enable rate limiter in test mode
      process.env.TEST_RATE_LIMIT = 'true';

      const limiter = createRateLimiter({
        windowMs: 15 * 60 * 1000,
        max: 5,
        prefix: 'test_rl',
        message: 'Rate limit exceeded.',
      });

      const testIp = `192.168.1.${Date.now() % 250}`;

      // Simulate 5 requests -> all should pass (calling next)
      for (let i = 1; i <= 5; i++) {
        let calledNext = false;
        let setHeaders = {};
        const req = { headers: { 'x-forwarded-for': testIp } };
        const res = {
          setHeader: (name, val) => {
            setHeaders[name] = val;
          },
        };

        await limiter(req, res, () => {
          calledNext = true;
        });

        assert.equal(calledNext, true, `Request ${i} should be allowed`);
        assert.equal(setHeaders['X-RateLimit-Limit'], 5);
        assert.equal(setHeaders['X-RateLimit-Remaining'], 5 - i);
      }

      // 6th request -> must receive 429 with Retry-After header
      let statusCode = 0;
      let responseBody = null;
      let setHeaders = {};
      const req6 = { headers: { 'x-forwarded-for': testIp } };
      const res6 = {
        setHeader: (name, val) => {
          setHeaders[name] = val;
        },
        status: (code) => {
          statusCode = code;
          return {
            json: (data) => {
              responseBody = data;
            },
          };
        },
      };

      await limiter(req6, res6, () => {
        assert.fail('6th request must not call next()');
      });

      assert.equal(statusCode, 429);
      assert.equal(responseBody.success, false);
      assert.ok(setHeaders['Retry-After'] > 0);
      assert.equal(setHeaders['X-RateLimit-Remaining'], 0);

      delete process.env.TEST_RATE_LIMIT;
    });
  });

  describe('4. NoSQL Operator Injection Sanitization', () => {
    it('should strip $ and . operator keys from nested payload structures', () => {
      const maliciousPayload = {
        email: 'victim@example.com',
        $where: 'sleep(5000)',
        'nested.field': 'injection',
        filters: {
          $gt: 0,
          $ne: null,
          category: 'Pro',
        },
        tags: ['singles', 'doubles'],
      };

      const sanitized = sanitizeObject(maliciousPayload);

      assert.equal(sanitized.email, 'victim@example.com');
      assert.equal(sanitized.$where, undefined);
      assert.equal(sanitized['nested.field'], undefined);
      assert.equal(sanitized.filters.$gt, undefined);
      assert.equal(sanitized.filters.$ne, undefined);
      assert.equal(sanitized.filters.category, 'Pro');
      assert.deepEqual(sanitized.tags, ['singles', 'doubles']);
    });
  });
});
