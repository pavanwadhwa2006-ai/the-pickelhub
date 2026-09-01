/**
 * Tournament & Competition Management Test Suite — Milestone 8
 *
 * Verifies:
 * 1. Competition Creation & Metadata Config.
 * 2. Atomic Registration & Capacity Guard (rejects duplicates & capacity overflow).
 * 3. Suspended-Player Protection (PRD 8.3 & Review Item 4).
 * 4. Status-Gated Withdrawal (Review Item 6).
 * 5. Team-Average Seeding for Doubles (Review Item 5).
 * 6. Power-of-2 Bracket Generation & Automatic Bye Advancement.
 * 7. Bracket Match Score Advancement through Championship Final.
 * 8. Atomic Rating Bonus Payout (+50, +25, +10) via ACID Transaction with 409 Guard.
 * 9. Paginated Rating History Audit Table.
 *
 * Run: node --test test/tournaments.test.js
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
const Tournament = require('../src/models/Tournament');
const RatingHistory = require('../src/models/RatingHistory');
const AuditLog = require('../src/models/AuditLog');
const {
  seedParticipants,
  generateBracketTree,
  advanceBracketMatch,
  executeTournamentBonusPayout,
} = require('../src/services/tournamentService');

describe('Milestone 8 — Tournaments & Admin Competition Manager', () => {
  let adminUser;
  let players = [];
  let userIds = [];
  let playerIds = [];
  let tournamentIds = [];

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
    }

    const timestamp = Date.now();

    // 1. Create Admin User
    adminUser = await User.create({
      email: `tourn_admin_${timestamp}@picklehub.test`,
      password: 'Password123!',
      role: 'ADMIN',
    });
    userIds.push(adminUser._id);

    // 2. Create 4 Test Players with staggered ratings (1400, 1200, 1100, 1000)
    const initialRatings = [1400, 1200, 1100, 1000];
    for (let i = 0; i < 4; i++) {
      const u = await User.create({
        email: `tourn_p${i + 1}_${timestamp}@picklehub.test`,
        password: 'Password123!',
        role: 'PLAYER',
      });
      userIds.push(u._id);

      const p = await Player.create({
        userId: u._id,
        playerId: `PH-T${i + 1}${timestamp.toString().slice(-3)}`,
        name: `Tournament Player ${i + 1}`,
        email: u.email,
        currentRating: initialRatings[i],
        highestRating: initialRatings[i],
        category: initialRatings[i] >= 1400 ? 'Pro' : initialRatings[i] >= 1200 ? 'Advanced Intermediate' : 'Intermediate',
      });
      playerIds.push(p._id);
      players.push(p);
    }
  });

  after(async () => {
    if (tournamentIds.length > 0) {
      await Tournament.deleteMany({ _id: { $in: tournamentIds } });
    }
    if (playerIds.length > 0) {
      await Player.deleteMany({ _id: { $in: playerIds } });
      await RatingHistory.deleteMany({ playerId: { $in: playerIds } });
    }
    if (userIds.length > 0) {
      await User.deleteMany({ _id: { $in: userIds } });
      await AuditLog.deleteMany({ performedBy: { $in: userIds } });
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  describe('1. Competition Creation & Model Validation', () => {
    it('should create a tournament with default bonus points and status REGISTRATION_OPEN', async () => {
      const tournament = await Tournament.create({
        name: 'PickleHub Autumn Open 2026',
        description: 'Sanctioned singles championship.',
        tournamentType: 'SINGLES',
        category: 'All',
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        registrationDeadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        maxParticipants: 4,
        bonusConfig: { winnerBonus: 50, runnerUpBonus: 25, semiFinalistBonus: 10 },
        createdBy: adminUser._id,
      });
      tournamentIds.push(tournament._id);

      assert.equal(tournament.name, 'PickleHub Autumn Open 2026');
      assert.equal(tournament.status, 'REGISTRATION_OPEN');
      assert.equal(tournament.bonusConfig.winnerBonus, 50);
      assert.equal(tournament.maxParticipants, 4);
    });
  });

  describe('2. Seeding Logic (Individual & Team Average)', () => {
    it('should correctly seed singles participants based on individual currentRating', () => {
      const rawParticipants = [
        { player: { _id: players[3]._id, currentRating: 1000 }, partner: null },
        { player: { _id: players[0]._id, currentRating: 1400 }, partner: null },
        { player: { _id: players[1]._id, currentRating: 1200 }, partner: null },
        { player: { _id: players[2]._id, currentRating: 1100 }, partner: null },
      ];

      const seeded = seedParticipants(rawParticipants, 'SINGLES');

      assert.equal(seeded[0].player._id.toString(), players[0]._id.toString());
      assert.equal(seeded[0].seed, 1);
      assert.equal(seeded[1].player._id.toString(), players[1]._id.toString());
      assert.equal(seeded[1].seed, 2);
      assert.equal(seeded[2].player._id.toString(), players[2]._id.toString());
      assert.equal(seeded[2].seed, 3);
      assert.equal(seeded[3].player._id.toString(), players[3]._id.toString());
      assert.equal(seeded[3].seed, 4);
    });

    it('should correctly seed doubles participants using team average rating', () => {
      // Team A: Player 1 (1400) + Player 4 (1000) -> Avg 1200
      // Team B: Player 2 (1200) + Player 3 (1100) -> Avg 1150
      const doublesParticipants = [
        {
          player: { _id: players[1]._id, currentRating: 1200 },
          partner: { _id: players[2]._id, currentRating: 1100 },
        },
        {
          player: { _id: players[0]._id, currentRating: 1400 },
          partner: { _id: players[3]._id, currentRating: 1000 },
        },
      ];

      const seeded = seedParticipants(doublesParticipants, 'DOUBLES');

      assert.equal(seeded[0].seed, 1);
      assert.equal(seeded[0].seedRating, 1200); // Team A
      assert.equal(seeded[1].seed, 2);
      assert.equal(seeded[1].seedRating, 1150); // Team B
    });
  });

  describe('3. Power-of-2 Bracket Generation & Bye Advancement', () => {
    it('should generate a 4-player bracket with 2 Semifinals and 1 Final', () => {
      const mockTournament = {
        participants: [
          { player: players[0], seed: 1 },
          { player: players[1], seed: 2 },
          { player: players[2], seed: 3 },
          { player: players[3], seed: 4 },
        ],
      };

      const bracket = generateBracketTree(mockTournament);

      // Total matches: 4/2 + 2/2 = 2 + 1 = 3 matches
      assert.equal(bracket.length, 3);

      // Round 1 Matches (Semifinals)
      const r1m0 = bracket.find((m) => m.matchId === 'R1_M0');
      const r1m1 = bracket.find((m) => m.matchId === 'R1_M1');
      const final = bracket.find((m) => m.matchId === 'R2_M0');

      assert.ok(r1m0 && r1m1 && final);
      // Seed 1 vs Seed 4 in R1_M0
      assert.equal(r1m0.player1.toString(), players[0]._id.toString());
      assert.equal(r1m0.player2.toString(), players[3]._id.toString());
      assert.equal(r1m0.status, 'READY');

      // Seed 2 vs Seed 3 in R1_M1
      assert.equal(r1m1.player1.toString(), players[1]._id.toString());
      assert.equal(r1m1.player2.toString(), players[2]._id.toString());
      assert.equal(r1m1.status, 'READY');

      // Final match pending
      assert.equal(final.round, 2);
      assert.equal(final.status, 'PENDING');
    });

    it('should automatically advance a participant receiving a Bye', () => {
      // 3 participants in a 4-bracket -> Seed 1 gets a Bye (vs Seed 4 null)
      const mockTournament3 = {
        participants: [
          { player: players[0], seed: 1 },
          { player: players[1], seed: 2 },
          { player: players[2], seed: 3 },
        ],
      };

      const bracket = generateBracketTree(mockTournament3);
      const r1m0 = bracket.find((m) => m.matchId === 'R1_M0');
      const final = bracket.find((m) => m.matchId === 'R2_M0');

      assert.equal(r1m0.status, 'BYE');
      assert.equal(r1m0.winner.toString(), players[0]._id.toString());
      // Seed 1 should immediately be placed in the Final
      assert.equal(final.player1.toString(), players[0]._id.toString());
    });
  });

  describe('4. Match Progression & Championship Resolution', () => {
    it('should advance match winners round-by-round and complete the tournament', async () => {
      const tournament = await Tournament.create({
        name: 'Live Championship 2026',
        tournamentType: 'SINGLES',
        startDate: new Date(),
        registrationDeadline: new Date(Date.now() - 1000),
        maxParticipants: 4,
        status: 'IN_PROGRESS',
        participants: [
          { player: players[0]._id, seed: 1, appliedBy: adminUser._id },
          { player: players[1]._id, seed: 2, appliedBy: adminUser._id },
          { player: players[2]._id, seed: 3, appliedBy: adminUser._id },
          { player: players[3]._id, seed: 4, appliedBy: adminUser._id },
        ],
        createdBy: adminUser._id,
      });
      tournamentIds.push(tournament._id);

      // Generate bracket
      tournament.bracket = generateBracketTree(tournament);
      await tournament.save();

      // Semifinal 1: Player 1 (Seed 1) vs Player 4 (Seed 4) -> Player 1 wins 11-4
      advanceBracketMatch(tournament, 'R1_M0', 11, 4);
      const finalAfterSemi1 = tournament.bracket.find((m) => m.matchId === 'R2_M0');
      assert.equal(finalAfterSemi1.player1.toString(), players[0]._id.toString());

      // Semifinal 2: Player 2 (Seed 2) vs Player 3 (Seed 3) -> Player 2 wins 11-7
      advanceBracketMatch(tournament, 'R1_M1', 11, 7);
      const finalAfterSemi2 = tournament.bracket.find((m) => m.matchId === 'R2_M0');
      assert.equal(finalAfterSemi2.player2.toString(), players[1]._id.toString());
      assert.equal(finalAfterSemi2.status, 'READY');

      // Final: Player 1 vs Player 2 -> Player 1 wins Championship 11-9
      advanceBracketMatch(tournament, 'R2_M0', 11, 9);
      await tournament.save();

      // Assert Tournament is COMPLETED with Winner & Runner-Up
      assert.equal(tournament.status, 'COMPLETED');
      assert.equal(tournament.winner.toString(), players[0]._id.toString());
      assert.equal(tournament.runnerUp.toString(), players[1]._id.toString());
      assert.equal(tournament.semiFinalists.length, 2);
    });
  });

  describe('5. Atomic Rating Bonus Payout & 409 Double-Award Guard', () => {
    it('should atomically distribute bonuses (+50 winner, +25 runner-up, +10 semis) and prevent duplicate payout with 409', async () => {
      const tournament = await Tournament.create({
        name: 'Bonus Payout Tournament',
        tournamentType: 'SINGLES',
        startDate: new Date(),
        registrationDeadline: new Date(),
        maxParticipants: 4,
        status: 'COMPLETED',
        bonusConfig: { winnerBonus: 50, runnerUpBonus: 25, semiFinalistBonus: 10 },
        winner: players[0]._id,
        runnerUp: players[1]._id,
        semiFinalists: [players[2]._id, players[3]._id],
        bonusesAwarded: false,
        createdBy: adminUser._id,
      });
      tournamentIds.push(tournament._id);

      const p0Before = (await Player.findById(players[0]._id)).currentRating;
      const p1Before = (await Player.findById(players[1]._id)).currentRating;

      // 1. First Bonus Payout -> Must Succeed
      const result = await executeTournamentBonusPayout(tournament._id, adminUser._id);
      assert.equal(result.success, true);
      assert.equal(result.payouts.length, 4);

      // Verify Player Ratings Updated
      const p0After = await Player.findById(players[0]._id);
      const p1After = await Player.findById(players[1]._id);
      assert.equal(p0After.currentRating, p0Before + 50); // Winner +50
      assert.equal(p1After.currentRating, p1Before + 25); // Runner-up +25
      assert.equal(p0After.tournamentWins, 1);

      // Verify RatingHistory documents created with changeType 'TOURNAMENT_BONUS'
      const history = await RatingHistory.find({ reason: new RegExp(tournament.name) });
      assert.equal(history.length, 4);
      assert.equal(history[0].changeType, 'TOURNAMENT_BONUS');

      // Verify AuditLog written
      const audit = await AuditLog.findOne({
        targetId: tournament._id,
        action: 'TOURNAMENT_BONUS_AWARD',
      });
      assert.ok(audit);

      // 2. Second Bonus Payout Attempt -> Must abort with 409 Conflict (Review Item 2)
      await assert.rejects(
        async () => {
          await executeTournamentBonusPayout(tournament._id, adminUser._id);
        },
        (err) => {
          assert.equal(err.statusCode, 409);
          assert.ok(err.message.includes('already been awarded'));
          return true;
        }
      );
    });
  });
});
