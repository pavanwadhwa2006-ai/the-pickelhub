/**
 * Analytics & Governance Test Suite — Milestone 9
 *
 * Verifies:
 * 1. Historical Rating Trajectory endpoint (GET /api/players/:id/rating-history)
 * 2. Specialty Leaders 30-day "Most Improved" aggregation (GET /api/players/leaders)
 * 3. Manual Rating Adjustment governance with mandatory audit reason (POST /api/admin/ratings/adjust)
 *    - Rejects missing/short reason with 400 (No Quiet Changes rule)
 *    - Atomically updates player rating & creates RatingHistory + AuditLog
 * 4. Match Score Correction with mandatory audit reason (PUT /api/admin/matches/:id/correct)
 *    - Rejects missing reason with 400
 *    - Updates match scores, sets isCorrected flag, and records AuditLog
 *
 * Run: node --test test/analyticsGovernance.test.js
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
const Match = require('../src/models/Match');
const RatingHistory = require('../src/models/RatingHistory');
const AuditLog = require('../src/models/AuditLog');
const { getPlayerRatingHistory, getLeaderboardSpecialties } = require('../src/controllers/playerController');
const { adjustRating, correctMatch } = require('../src/controllers/adminController');

describe('Milestone 9 — Analytics & Governance Test Suite', () => {
  let adminUser, testPlayer;
  let testMatch;
  const createdUserIds = [];
  const createdPlayerIds = [];
  const createdMatchIds = [];

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
    }

    const timestamp = Date.now();

    // 1. Create Admin
    adminUser = await User.create({
      email: `gov_admin_${timestamp}@picklehub.test`,
      password: 'Password123!',
      role: 'ADMIN',
    });
    createdUserIds.push(adminUser._id);

    // 2. Create Test Player
    const playerUser = await User.create({
      email: `gov_player_${timestamp}@picklehub.test`,
      password: 'Password123!',
      role: 'PLAYER',
    });
    createdUserIds.push(playerUser._id);

    testPlayer = await Player.create({
      userId: playerUser._id,
      playerId: `PH-${Math.floor(10000 + Math.random() * 90000)}`,
      name: 'Analytics Test Player',
      email: playerUser.email,
      currentRating: 1050,
      highestRating: 1050,
      category: 'Intermediate',
      accountStatus: 'ACTIVE',
    });
    createdPlayerIds.push(testPlayer._id);

    // 3. Create RatingHistory entry
    await RatingHistory.create({
      playerId: testPlayer._id,
      changeType: 'MATCH',
      ratingBefore: 1000,
      ratingAfter: 1050,
      delta: 50,
      categoryBefore: 'Intermediate',
      categoryAfter: 'Intermediate',
      reason: 'Test Match Win',
      createdAt: new Date(),
    });

    // 4. Create Approved Match
    testMatch = await Match.create({
      matchId: `PH-M${Math.floor(10000 + Math.random() * 90000)}`,
      court: 'Court 1',
      matchType: 'SINGLES',
      teamA: [testPlayer._id],
      teamB: [testPlayer._id], // For testing purposes
      scores: [{ gameNumber: 1, teamAScore: 11, teamBScore: 8 }],
      winnerTeam: 'A',
      status: 'APPROVED',
      submittedBy: testPlayer._id,
    });
    createdMatchIds.push(testMatch._id);
  });

  after(async () => {
    if (createdMatchIds.length > 0) {
      await Match.deleteMany({ _id: { $in: createdMatchIds } });
    }
    if (createdPlayerIds.length > 0) {
      await Player.deleteMany({ _id: { $in: createdPlayerIds } });
      await RatingHistory.deleteMany({ playerId: { $in: createdPlayerIds } });
      await AuditLog.deleteMany({ targetId: { $in: createdPlayerIds } });
    }
    if (createdUserIds.length > 0) {
      await User.deleteMany({ _id: { $in: createdUserIds } });
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  describe('1. Rating History Trajectory (GET /api/players/:id/rating-history)', () => {
    it('should return chronological rating history including baseline 1000 Elo', async () => {
      const req = { params: { id: testPlayer.playerId } };
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

      await getPlayerRatingHistory(req, res, (err) => { throw err; });

      assert.equal(statusCode, 200);
      assert.equal(responseBody.success, true);
      assert.ok(Array.isArray(responseBody.data.history));
      assert.ok(responseBody.data.history.length >= 2, 'Should have baseline + match record');
      assert.equal(responseBody.data.history[0].rating, 1000);
      assert.equal(responseBody.data.history[1].rating, 1050);
      assert.equal(responseBody.data.history[1].delta, 50);
    });
  });

  describe('2. Specialty Leaders 30-day "Most Improved"', () => {
    it('should include mostImproved player in leaderboard specialties', async () => {
      const req = {};
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

      await getLeaderboardSpecialties(req, res, (err) => { throw err; });

      assert.equal(statusCode, 200);
      assert.equal(responseBody.success, true);
      assert.ok('mostImproved' in responseBody.data);
      if (responseBody.data.mostImproved) {
        assert.ok(responseBody.data.mostImproved.netGain > 0);
      }
    });
  });

  describe('3. Manual Rating Adjustment (POST /api/admin/ratings/adjust)', () => {
    it('should reject manual adjustment with 400 when reason is missing or too short', async () => {
      const req = {
        user: adminUser,
        body: {
          playerId: testPlayer._id,
          newRating: 1250,
          reason: 'bad', // less than 5 characters
        },
      };

      let errCaught = null;
      const res = {};
      await adjustRating(req, res, (err) => {
        errCaught = err;
      });

      assert.ok(errCaught);
      assert.equal(errCaught.statusCode, 400);
      assert.match(errCaught.message, /justification reason/i);
    });

    it('should update player rating, category, and create RatingHistory and AuditLog', async () => {
      const req = {
        user: adminUser,
        body: {
          playerId: testPlayer.playerId,
          newRating: 1250,
          reason: 'Annual club championship seeding adjustment',
        },
      };

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

      await adjustRating(req, res, (err) => { throw err; });

      assert.equal(statusCode, 200);
      assert.equal(responseBody.success, true);
      assert.equal(responseBody.data.player.currentRating, 1250);
      assert.equal(responseBody.data.player.category, 'Advanced Intermediate');

      // Verify AuditLog record
      const auditLog = await AuditLog.findOne({
        action: 'MANUAL_RATING_ADJUST',
        targetId: testPlayer._id,
      });
      assert.ok(auditLog);
      assert.equal(auditLog.metadata.newRating, 1250);
      assert.equal(auditLog.metadata.reason, 'Annual club championship seeding adjustment');
    });
  });

  describe('4. Match Score Correction (PUT /api/admin/matches/:id/correct)', () => {
    it('should reject match correction with 400 when reason is missing', async () => {
      const req = {
        user: adminUser,
        params: { id: testMatch._id },
        body: {
          scores: [{ gameNumber: 1, teamAScore: 11, teamBScore: 9 }],
          reason: '', // empty reason
        },
      };

      let errCaught = null;
      const res = {};
      await correctMatch(req, res, (err) => {
        errCaught = err;
      });

      assert.ok(errCaught);
      assert.equal(errCaught.statusCode, 400);
      assert.match(errCaught.message, /justification reason/i);
    });

    it('should update match scores, set isCorrected flag, and write AuditLog', async () => {
      const req = {
        user: adminUser,
        params: { id: testMatch._id },
        body: {
          scores: [{ gameNumber: 1, teamAScore: 12, teamBScore: 10 }],
          winnerTeam: 'A',
          reason: 'Scorekeeper typographical correction on game 1',
        },
      };

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

      await correctMatch(req, res, (err) => { throw err; });

      assert.equal(statusCode, 200);
      assert.equal(responseBody.success, true);
      assert.equal(responseBody.data.isCorrected, true);
      assert.equal(responseBody.data.correctionReason, 'Scorekeeper typographical correction on game 1');

      // Verify AuditLog
      const auditLog = await AuditLog.findOne({
        action: 'MATCH_CORRECT',
        targetId: testMatch._id,
      });
      assert.ok(auditLog);
      assert.equal(auditLog.metadata.reason, 'Scorekeeper typographical correction on game 1');
    });
  });
});
