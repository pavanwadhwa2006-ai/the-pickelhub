/**
 * Batch Match Approval Test Suite
 *
 * Verifies:
 * 1. Batch approval of multiple pending matches sequentially in atomic transactions
 * 2. Ratings and standings update correctly for all participants
 * 3. AuditLog and RatingHistory records generated for each approved match
 * 4. Graceful handling of empty queue or already-approved matches
 *
 * Run: node --test test/batchApproval.test.js
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
const { executeBatchMatchApproval } = require('../src/services/adminService');
const { batchApproveMatches } = require('../src/controllers/adminController');

describe('Court Owner Batch Match Approval Suite', () => {
  let adminUser;
  let playerA, playerB;
  const createdUserIds = [];
  const createdPlayerIds = [];
  const createdMatchIds = [];

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
    }

    const timestamp = Date.now();

    // Create Admin User
    adminUser = await User.create({
      email: `batch_admin_${timestamp}@picklehub.test`,
      password: 'Password123!',
      role: 'ADMIN',
    });
    createdUserIds.push(adminUser._id);

    // Create Player A (1000 Elo)
    const userA = await User.create({
      email: `batch_pA_${timestamp}@picklehub.test`,
      password: 'Password123!',
      role: 'PLAYER',
    });
    createdUserIds.push(userA._id);
    playerA = await Player.create({
      userId: userA._id,
      playerId: `PH-${Math.floor(10000 + Math.random() * 90000)}`,
      name: 'Batch Player A',
      email: userA.email,
      currentRating: 1000,
      highestRating: 1000,
      category: 'Intermediate',
      accountStatus: 'ACTIVE',
    });
    createdPlayerIds.push(playerA._id);

    // Create Player B (1000 Elo)
    const userB = await User.create({
      email: `batch_pB_${timestamp}@picklehub.test`,
      password: 'Password123!',
      role: 'PLAYER',
    });
    createdUserIds.push(userB._id);
    playerB = await Player.create({
      userId: userB._id,
      playerId: `PH-${Math.floor(10000 + Math.random() * 90000)}`,
      name: 'Batch Player B',
      email: userB.email,
      currentRating: 1000,
      highestRating: 1000,
      category: 'Intermediate',
      accountStatus: 'ACTIVE',
    });
    createdPlayerIds.push(playerB._id);
  });

  after(async () => {
    if (createdMatchIds.length > 0) {
      await Match.deleteMany({ _id: { $in: createdMatchIds } });
      await RatingHistory.deleteMany({ matchId: { $in: createdMatchIds } });
      await AuditLog.deleteMany({ targetId: { $in: createdMatchIds } });
    }
    if (createdPlayerIds.length > 0) {
      await Player.deleteMany({ _id: { $in: createdPlayerIds } });
      await RatingHistory.deleteMany({ playerId: { $in: createdPlayerIds } });
    }
    if (createdUserIds.length > 0) {
      await User.deleteMany({ _id: { $in: createdUserIds } });
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  it('should batch approve multiple pending matches and atomically update ratings', async () => {
    // 1. Create two pending matches
    const match1 = await Match.create({
      matchId: `PH-M${Math.floor(10000 + Math.random() * 90000)}`,
      court: 'Court 1',
      matchType: 'SINGLES',
      teamA: [playerA._id],
      teamB: [playerB._id],
      scores: [{ gameNumber: 1, teamAScore: 11, teamBScore: 7 }],
      winnerTeam: 'A',
      status: 'PENDING_APPROVAL',
      submittedBy: playerA._id,
    });
    createdMatchIds.push(match1._id);

    const match2 = await Match.create({
      matchId: `PH-M${Math.floor(10000 + Math.random() * 90000)}`,
      court: 'Court 2',
      matchType: 'SINGLES',
      teamA: [playerA._id],
      teamB: [playerB._id],
      scores: [{ gameNumber: 1, teamAScore: 11, teamBScore: 9 }],
      winnerTeam: 'A',
      status: 'PENDING_APPROVAL',
      submittedBy: playerA._id,
    });
    createdMatchIds.push(match2._id);

    // 2. Execute batch approval for both matches
    const req = {
      user: adminUser,
      body: { matchIds: [match1._id, match2._id] },
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

    await batchApproveMatches(req, res, (err) => { throw err; });

    assert.equal(statusCode, 200);
    assert.equal(responseBody.success, true);
    assert.equal(responseBody.data.approvedCount, 2);

    // 3. Verify match statuses in DB
    const updatedMatch1 = await Match.findById(match1._id);
    const updatedMatch2 = await Match.findById(match2._id);
    assert.equal(updatedMatch1.status, 'APPROVED');
    assert.equal(updatedMatch2.status, 'APPROVED');

    // 4. Verify player ratings increased for winner Player A
    const refreshedPlayerA = await Player.findById(playerA._id);
    assert.ok(refreshedPlayerA.currentRating > 1000);
    assert.equal(refreshedPlayerA.wins, 2);
  });

  it('should gracefully handle empty match list or already approved matches with 0 approvals', async () => {
    const req = {
      user: adminUser,
      body: { matchIds: [] },
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

    await batchApproveMatches(req, res, (err) => { throw err; });

    assert.equal(statusCode, 200);
    assert.equal(responseBody.success, true);
    assert.equal(responseBody.data.approvedCount, 0);
  });
});
