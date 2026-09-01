/**
 * Admin Approvals & Atomic Governance Test Suite — Milestone 7
 *
 * Verifies:
 * 1. Correct Elo delta application & atomic multi-doc updates for Singles & Doubles.
 * 2. Concurrency guard: 409 Conflict when approving non-PENDING matches.
 * 3. Atomic rollback: zero partial writes on mid-transaction failures.
 * 4. Reject endpoint validation: requires non-empty reason.
 * 5. Reject endpoint safety: zero rating side-effects.
 * 6. Direct entry: creates auto-approved match with immediate Elo updates.
 * 7. AuditLog generation for MATCH_APPROVE, MATCH_REJECT, and DIRECT_MATCH_CREATE.
 *
 * Run: node --test test/adminApprovals.test.js
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
const { executeAtomicMatchApproval } = require('../src/services/adminService');
const { rejectMatch, createDirectMatch } = require('../src/controllers/adminController');

describe('Admin Approvals & Atomic Transactions — Milestone 7', () => {
  let adminUser;
  let testPlayerA1, testPlayerA2, testPlayerB1, testPlayerB2;
  const createdMatchIds = [];
  const createdPlayerIds = [];
  const createdUserIds = [];

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
    }

    // Create a mock admin user
    adminUser = await User.create({
      email: `testadmin_${Date.now()}@picklehub.test`,
      password: 'Password123!',
      role: 'ADMIN',
    });
    createdUserIds.push(adminUser._id);

    // Create 4 test players with 1000 Elo baseline
    const timestamp = Date.now();
    const createTestPlayer = async (index, rating = 1000) => {
      const user = await User.create({
        email: `player_${index}_${timestamp}@picklehub.test`,
        password: 'Password123!',
        role: 'PLAYER',
      });
      createdUserIds.push(user._id);

      const player = await Player.create({
        userId: user._id,
        playerId: `PH-T${String(index).padStart(4, '0')}`,
        name: `Test Player ${index}`,
        email: user.email,
        currentRating: rating,
        highestRating: rating,
        category: 'Intermediate',
        matchesPlayed: 0,
        wins: 0,
        losses: 0,
        winningStreak: 0,
      });
      createdPlayerIds.push(player._id);
      return player;
    };

    testPlayerA1 = await createTestPlayer(1, 1000);
    testPlayerA2 = await createTestPlayer(2, 1000);
    testPlayerB1 = await createTestPlayer(3, 1000);
    testPlayerB2 = await createTestPlayer(4, 1000);
  });

  after(async () => {
    // Clean up created test documents
    if (createdMatchIds.length > 0) {
      await Match.deleteMany({ _id: { $in: createdMatchIds } });
      await RatingHistory.deleteMany({ matchId: { $in: createdMatchIds } });
      await AuditLog.deleteMany({ targetId: { $in: createdMatchIds } });
    }
    if (createdPlayerIds.length > 0) {
      await Player.deleteMany({ _id: { $in: createdPlayerIds } });
    }
    if (createdUserIds.length > 0) {
      await User.deleteMany({ _id: { $in: createdUserIds } });
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  describe('1. Atomic Match Approval (Singles & Doubles Elo Deltas)', () => {
    it('should approve Singles match, apply correct ±16 Elo deltas, create RatingHistory, and write AuditLog', async () => {
      // 1. Create a Singles match (Player A1 vs Player B1, equal 1000 ratings, Team A wins)
      const match = await Match.create({
        matchId: `PH-MT1_${Date.now()}`,
        court: 'Court 1',
        matchType: 'SINGLES',
        teamA: [testPlayerA1._id],
        teamB: [testPlayerB1._id],
        scores: [{ teamAScore: 11, teamBScore: 7 }],
        winnerTeam: 'A',
        status: 'PENDING_APPROVAL',
        submittedBy: testPlayerA1._id,
      });
      createdMatchIds.push(match._id);

      // 2. Approve match atomically
      const approved = await executeAtomicMatchApproval({
        matchId: match._id,
        adminUserId: adminUser._id,
        actionType: 'MATCH_APPROVE',
      });

      assert.equal(approved.status, 'APPROVED');
      assert.equal(approved.approvedBy._id.toString(), adminUser._id.toString());
      assert.equal(approved.ratingChanges.length, 2);

      // Verify deltas: Winner +16 (1016), Loser -16 (984)
      const changeA = approved.ratingChanges.find((c) => c.playerId.toString() === testPlayerA1._id.toString());
      const changeB = approved.ratingChanges.find((c) => c.playerId.toString() === testPlayerB1._id.toString());
      assert.equal(changeA.delta, 16);
      assert.equal(changeA.newRating, 1016);
      assert.equal(changeB.delta, -16);
      assert.equal(changeB.newRating, 984);

      // Verify Player records updated in DB
      const updatedA1 = await Player.findById(testPlayerA1._id);
      const updatedB1 = await Player.findById(testPlayerB1._id);
      assert.equal(updatedA1.currentRating, 1016);
      assert.equal(updatedA1.highestRating, 1016);
      assert.equal(updatedA1.wins, 1);
      assert.equal(updatedA1.winningStreak, 1);
      assert.equal(updatedA1.matchesPlayed, 1);

      assert.equal(updatedB1.currentRating, 984);
      assert.equal(updatedB1.category, 'Beginner'); // 984 < 1000 -> Beginner
      assert.equal(updatedB1.losses, 1);
      assert.equal(updatedB1.winningStreak, 0);
      assert.equal(updatedB1.matchesPlayed, 1);

      // Verify RatingHistory entries
      const histories = await RatingHistory.find({ matchId: match._id });
      assert.equal(histories.length, 2);
      const historyA = histories.find((h) => h.playerId.toString() === testPlayerA1._id.toString());
      assert.equal(historyA.ratingBefore, 1000);
      assert.equal(historyA.ratingAfter, 1016);
      assert.equal(historyA.delta, 16);
      assert.equal(historyA.changeType, 'MATCH');

      // Verify AuditLog entry
      const audit = await AuditLog.findOne({ targetId: match._id, action: 'MATCH_APPROVE' });
      assert.ok(audit);
      assert.equal(audit.performedBy.toString(), adminUser._id.toString());
      assert.equal(audit.metadata.matchId, match.matchId);
    });

    it('should approve Doubles match with 4 players and individually weighted deltas', async () => {
      const match = await Match.create({
        matchId: `PH-MT2_${Date.now()}`,
        court: 'Court 2',
        matchType: 'DOUBLES',
        teamA: [testPlayerA1._id, testPlayerA2._id],
        teamB: [testPlayerB1._id, testPlayerB2._id],
        scores: [{ teamAScore: 11, teamBScore: 9 }],
        winnerTeam: 'A',
        status: 'PENDING_APPROVAL',
        submittedBy: testPlayerA1._id,
      });
      createdMatchIds.push(match._id);

      const approved = await executeAtomicMatchApproval({
        matchId: match._id,
        adminUserId: adminUser._id,
        actionType: 'MATCH_APPROVE',
      });

      assert.equal(approved.status, 'APPROVED');
      assert.equal(approved.ratingChanges.length, 4);

      // Verify 4 RatingHistory entries created
      const histories = await RatingHistory.find({ matchId: match._id });
      assert.equal(histories.length, 4);
    });
  });

  describe('2. Concurrency & Double-Approval Guard', () => {
    it('should reject approval with 409 Conflict if match is not PENDING_APPROVAL', async () => {
      const match = await Match.create({
        matchId: `PH-MT3_${Date.now()}`,
        court: 'Court 1',
        matchType: 'SINGLES',
        teamA: [testPlayerA1._id],
        teamB: [testPlayerB1._id],
        scores: [{ teamAScore: 11, teamBScore: 4 }],
        winnerTeam: 'A',
        status: 'PENDING_APPROVAL',
        submittedBy: testPlayerA1._id,
      });
      createdMatchIds.push(match._id);

      // First approval succeeds
      await executeAtomicMatchApproval({
        matchId: match._id,
        adminUserId: adminUser._id,
      });

      // Second approval on same match must fail with 409 Conflict
      await assert.rejects(
        async () => {
          await executeAtomicMatchApproval({
            matchId: match._id,
            adminUserId: adminUser._id,
          });
        },
        (err) => {
          assert.equal(err.statusCode, 409);
          return true;
        }
      );
    });
  });

  describe('3. Transaction Atomicity & Rollback Guarantee', () => {
    it('should cleanly abort transaction and produce zero partial writes on failure', async () => {
      // Create fresh test player for clean baseline
      const pA = await Player.create({
        userId: new mongoose.Types.ObjectId(),
        playerId: `PH-TX1_${Date.now().toString().slice(-4)}`,
        name: 'Atomic Player A',
        email: `atom_a_${Date.now()}@picklehub.test`,
        currentRating: 1000,
        highestRating: 1000,
        category: 'Intermediate',
        matchesPlayed: 0,
        wins: 0,
        losses: 0,
        winningStreak: 0,
      });
      createdPlayerIds.push(pA._id);

      const pB = await Player.create({
        userId: new mongoose.Types.ObjectId(),
        playerId: `PH-TX2_${Date.now().toString().slice(-4)}`,
        name: 'Atomic Player B',
        email: `atom_b_${Date.now()}@picklehub.test`,
        currentRating: 1000,
        highestRating: 1000,
        category: 'Intermediate',
        matchesPlayed: 0,
        wins: 0,
        losses: 0,
        winningStreak: 0,
      });
      createdPlayerIds.push(pB._id);

      // Create match pointing to an unresolvable fake player ID in teamB to trigger mid-transaction failure
      const fakePlayerId = new mongoose.Types.ObjectId();
      const match = await Match.create({
        matchId: `PH-MT_FAIL_${Date.now()}`,
        court: 'Court 1',
        matchType: 'SINGLES',
        teamA: [pA._id],
        teamB: [fakePlayerId], // Missing player will trigger Error('One or more participating player profiles could not be found.')
        scores: [{ teamAScore: 11, teamBScore: 5 }],
        winnerTeam: 'A',
        status: 'PENDING_APPROVAL',
        submittedBy: pA._id,
      });
      createdMatchIds.push(match._id);

      // Attempt approval, should fail mid-transaction
      await assert.rejects(async () => {
        await executeAtomicMatchApproval({
          matchId: match._id,
          adminUserId: adminUser._id,
        });
      });

      // Assert zero partial writes occurred
      const freshMatch = await Match.findById(match._id);
      assert.equal(freshMatch.status, 'PENDING_APPROVAL');
      assert.equal(freshMatch.ratingChanges.length, 0);

      const freshPA = await Player.findById(pA._id);
      assert.equal(freshPA.currentRating, 1000);
      assert.equal(freshPA.matchesPlayed, 0);
      assert.equal(freshPA.wins, 0);

      const histories = await RatingHistory.find({ matchId: match._id });
      assert.equal(histories.length, 0);

      const audits = await AuditLog.find({ targetId: match._id });
      assert.equal(audits.length, 0);
    });
  });

  describe('4. Match Rejection & Safety', () => {
    it('should reject match when reason is provided and have zero rating side-effects', async () => {
      const p = await Player.findById(testPlayerA1._id);
      const ratingBefore = p.currentRating;

      const match = await Match.create({
        matchId: `PH-MT_REJ_${Date.now()}`,
        court: 'Court 3',
        matchType: 'SINGLES',
        teamA: [testPlayerA1._id],
        teamB: [testPlayerB1._id],
        scores: [{ teamAScore: 11, teamBScore: 0 }],
        winnerTeam: 'A',
        status: 'PENDING_APPROVAL',
        submittedBy: testPlayerA1._id,
      });
      createdMatchIds.push(match._id);

      // Mock req, res
      let responseStatus = 0;
      let responseBody = null;
      const req = {
        params: { id: match._id.toString() },
        body: { reason: 'Opponent reported game was abandoned early due to rain.' },
        user: adminUser,
      };
      const res = {
        status: (code) => {
          responseStatus = code;
          return {
            json: (data) => {
              responseBody = data;
            },
          };
        },
      };

      await rejectMatch(req, res, () => {});

      assert.equal(responseStatus, 200);
      assert.equal(responseBody.data.status, 'REJECTED');
      assert.equal(responseBody.data.rejectionReason, 'Opponent reported game was abandoned early due to rain.');

      // Assert zero rating side-effects
      const pAfter = await Player.findById(testPlayerA1._id);
      assert.equal(pAfter.currentRating, ratingBefore);

      const histories = await RatingHistory.find({ matchId: match._id });
      assert.equal(histories.length, 0);

      // Assert AuditLog created
      const audit = await AuditLog.findOne({ targetId: match._id, action: 'MATCH_REJECT' });
      assert.ok(audit);
      assert.equal(audit.metadata.reason, 'Opponent reported game was abandoned early due to rain.');
    });

    it('should return 400 when rejection reason is missing or empty', async () => {
      const match = await Match.create({
        matchId: `PH-MT_REJ2_${Date.now()}`,
        court: 'Court 1',
        matchType: 'SINGLES',
        teamA: [testPlayerA1._id],
        teamB: [testPlayerB1._id],
        scores: [{ teamAScore: 11, teamBScore: 8 }],
        winnerTeam: 'A',
        status: 'PENDING_APPROVAL',
        submittedBy: testPlayerA1._id,
      });
      createdMatchIds.push(match._id);

      let responseStatus = 0;
      const req = {
        params: { id: match._id.toString() },
        body: { reason: '   ' },
        user: adminUser,
      };
      const res = {
        status: (code) => {
          responseStatus = code;
          return { json: () => {} };
        },
      };

      await rejectMatch(req, res, () => {});
      assert.equal(responseStatus, 400);
    });
  });

  describe('5. Direct Official Match Recording', () => {
    it('should create an immediately approved match with instant Elo updates and DIRECT_MATCH_CREATE audit log', async () => {
      let responseStatus = 0;
      let responseBody = null;

      const req = {
        body: {
          matchType: 'SINGLES',
          court: 'Center Court',
          teamA: [testPlayerA2._id],
          teamB: [testPlayerB2._id],
          scores: [{ teamAScore: 11, teamBScore: 6 }],
          winnerTeam: 'A',
        },
        user: adminUser,
      };

      const res = {
        status: (code) => {
          responseStatus = code;
          return {
            json: (data) => {
              responseBody = data;
            },
          };
        },
      };

      await createDirectMatch(req, res, (err) => {
        if (err) throw err;
      });

      assert.equal(responseStatus, 201);
      assert.ok(responseBody.data);
      assert.equal(responseBody.data.status, 'APPROVED');
      assert.equal(responseBody.data.recordedByAdmin, true);
      createdMatchIds.push(responseBody.data._id);

      // Verify AuditLog
      const audit = await AuditLog.findOne({
        targetId: responseBody.data._id,
        action: 'DIRECT_MATCH_CREATE',
      });
      assert.ok(audit);
      assert.equal(audit.performedBy.toString(), adminUser._id.toString());
    });
  });
});
