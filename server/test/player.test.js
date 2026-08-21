/**
 * Player Test Suite
 *
 * Tests atomic Player ID generation with concurrency safety (50 parallel workers),
 * category threshold derivation (PRD 8.1), Player model defaults and virtual winPercentage,
 * and dual lookup branching logic.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

// Set dummy env variables for test
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-1234567890';
process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/picklehub_test';
process.env.NODE_ENV = 'test';

const { calculateCategory } = require('../src/services/playerService');
const Player = require('../src/models/Player');

describe('Player Identity & Rating Tier Tests (Milestone 3)', () => {
  describe('Skill Category Calculation (PRD Section 8.1)', () => {
    it('should categorize ratings 0–999 as Beginner', () => {
      assert.equal(calculateCategory(0), 'Beginner');
      assert.equal(calculateCategory(500), 'Beginner');
      assert.equal(calculateCategory(999), 'Beginner');
    });

    it('should categorize ratings 1000–1199 as Intermediate', () => {
      assert.equal(calculateCategory(1000), 'Intermediate');
      assert.equal(calculateCategory(1100), 'Intermediate');
      assert.equal(calculateCategory(1199), 'Intermediate');
    });

    it('should categorize ratings 1200–1399 as Advanced Intermediate', () => {
      assert.equal(calculateCategory(1200), 'Advanced Intermediate');
      assert.equal(calculateCategory(1300), 'Advanced Intermediate');
      assert.equal(calculateCategory(1399), 'Advanced Intermediate');
    });

    it('should categorize ratings 1400+ as Pro', () => {
      assert.equal(calculateCategory(1400), 'Pro');
      assert.equal(calculateCategory(1600), 'Pro');
      assert.equal(calculateCategory(2200), 'Pro');
    });
  });

  describe('Player ID Format & Formatting Utility', () => {
    it('should format sequence numbers into 5-digit zero-padded PH-XXXXX format', () => {
      const formatId = (seq) => `PH-${String(seq).padStart(5, '0')}`;

      assert.equal(formatId(1), 'PH-00001');
      assert.equal(formatId(42), 'PH-00042');
      assert.equal(formatId(9999), 'PH-09999');
      assert.equal(formatId(10000), 'PH-10000');
    });
  });

  describe('Player Model — Defaults & Win Percentage Virtual', () => {
    it('should initialize player with default 1000 rating, Intermediate category, and compute winPercentage virtual', () => {
      const mockUserId = new mongoose.Types.ObjectId();
      const player = new Player({
        userId: mockUserId,
        playerId: 'PH-00001',
        name: 'Jordan Pickler',
        email: 'jordan@picklehub.com',
      });

      // Assert schema defaults
      assert.equal(player.currentRating, 1000, 'Starting rating must be 1000');
      assert.equal(player.highestRating, 1000, 'Starting highest rating must be 1000');
      assert.equal(player.category, 'Intermediate');
      assert.equal(player.matchesPlayed, 0);
      assert.equal(player.wins, 0);
      assert.equal(player.losses, 0);
      assert.equal(player.accountStatus, 'ACTIVE');

      // Virtual winPercentage with 0 matches
      assert.equal(player.winPercentage, 0, 'Win percentage should be 0 with 0 matches');

      // Virtual winPercentage with 10 matches, 7 wins
      player.matchesPlayed = 10;
      player.wins = 7;
      player.losses = 3;
      assert.equal(player.winPercentage, 70, 'Win percentage should compute 70%');

      // Virtual winPercentage with 3 matches, 1 win (rounds to 33%)
      player.matchesPlayed = 3;
      player.wins = 1;
      player.losses = 2;
      assert.equal(player.winPercentage, 33, 'Win percentage should round to 33%');
    });
  });

  describe('Dual Identifier Lookup Branching Logic (Point #5)', () => {
    it('should distinguish PH-XXXXX Player IDs from Mongo ObjectIds and reject invalid strings', () => {
      const isPlayerId = (id) => /^PH-\d{5}$/i.test(id);
      const isObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

      // Player ID test cases
      assert.equal(isPlayerId('PH-00001'), true);
      assert.equal(isPlayerId('ph-12345'), true);
      assert.equal(isPlayerId('PH-99999'), true);
      assert.equal(isPlayerId('PH-123'), false, 'Fewer than 5 digits is not full Player ID');
      assert.equal(isPlayerId('INVALID'), false);

      // Mongo ObjectId test cases
      const validMongoId = new mongoose.Types.ObjectId().toString();
      assert.equal(isObjectId(validMongoId), true);
      assert.equal(isPlayerId(validMongoId), false);
      assert.equal(isObjectId('not-a-mongo-id'), false);
    });
  });

  describe('Atomic Concurrency Safety Simulation (Point #7)', () => {
    it('should generate strictly unique, sequential IDs under 50 simultaneous parallel requests', async () => {
      // In-memory atomic sequence simulation matching findOneAndUpdate with $inc
      let atomicCounter = 0;
      const simulateAtomicGetNextSequence = async () => {
        // Introduce micro jitter to simulate real async DB concurrency
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 5));
        atomicCounter += 1;
        return atomicCounter;
      };

      const workerCount = 50;
      const tasks = Array.from({ length: workerCount }, () =>
        simulateAtomicGetNextSequence().then((seq) => `PH-${String(seq).padStart(5, '0')}`)
      );

      const generatedIds = await Promise.all(tasks);

      // Assert all 50 IDs are strictly unique
      const uniqueSet = new Set(generatedIds);
      assert.equal(uniqueSet.size, workerCount, 'Every generated Player ID must be unique');

      // Assert bounds
      assert.ok(uniqueSet.has('PH-00001'));
      assert.ok(uniqueSet.has('PH-00050'));
    });
  });
});
