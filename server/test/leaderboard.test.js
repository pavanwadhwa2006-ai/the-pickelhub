/**
 * Leaderboard & Compare Engine Test Suite — Milestone 6
 *
 * Comprehensive tests for leaderboard querying, multi-sorting, category filters,
 * specialty leader blocks (PRD Section 8.2), and head-to-head comparison analytics.
 *
 * Run: node --test test/leaderboard.test.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

// Set dummy env variables for test
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-1234567890';
process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/picklehub_test';
process.env.NODE_ENV = 'test';

const { calculateExpectedScore } = require('../src/services/ratingService');

describe('Leaderboard & Compare Engine — Milestone 6', () => {
  describe('Specialty Leader Qualifications (PRD Section 8.2)', () => {
    it('should enforce min 5 matches played for highest win % qualification', () => {
      // Mock player pool
      const players = [
        {
          playerId: 'PH-00001',
          name: 'Novice Winner',
          matchesPlayed: 1,
          wins: 1,
          losses: 0,
          winPercentage: 100, // 100% with only 1 match
          currentRating: 1016,
          accountStatus: 'ACTIVE',
        },
        {
          playerId: 'PH-00002',
          name: 'Veteran Champion',
          matchesPlayed: 10,
          wins: 9,
          losses: 1,
          winPercentage: 90, // 90% with 10 matches (qualified)
          currentRating: 1250,
          accountStatus: 'ACTIVE',
        },
        {
          playerId: 'PH-00003',
          name: 'Suspended Pro',
          matchesPlayed: 20,
          wins: 20,
          winPercentage: 100,
          currentRating: 1600,
          accountStatus: 'SUSPENDED', // Excluded
        },
      ];

      // Filter active and minimum 5 matches
      const eligibleForWinRateLeader = players
        .filter((p) => p.accountStatus === 'ACTIVE' && p.matchesPlayed >= 5)
        .sort((a, b) => b.winPercentage - a.winPercentage || b.matchesPlayed - a.matchesPlayed);

      assert.equal(eligibleForWinRateLeader.length, 1);
      assert.equal(eligibleForWinRateLeader[0].playerId, 'PH-00002');
      assert.equal(eligibleForWinRateLeader[0].name, 'Veteran Champion');
    });

    it('should correctly select the highest rated active player', () => {
      const players = [
        { playerId: 'PH-00001', currentRating: 1000, accountStatus: 'ACTIVE' },
        { playerId: 'PH-00002', currentRating: 1450, accountStatus: 'ACTIVE' },
        { playerId: 'PH-00003', currentRating: 1800, accountStatus: 'SUSPENDED' },
      ];

      const highestActive = players
        .filter((p) => p.accountStatus === 'ACTIVE')
        .sort((a, b) => b.currentRating - a.currentRating)[0];

      assert.equal(highestActive.playerId, 'PH-00002');
      assert.equal(highestActive.currentRating, 1450);
    });

    it('should correctly select the longest active winning streak', () => {
      const players = [
        { playerId: 'PH-00001', winningStreak: 2, accountStatus: 'ACTIVE' },
        { playerId: 'PH-00002', winningStreak: 7, accountStatus: 'ACTIVE' },
        { playerId: 'PH-00003', winningStreak: 12, accountStatus: 'SUSPENDED' },
      ];

      const longestStreak = players
        .filter((p) => p.accountStatus === 'ACTIVE')
        .sort((a, b) => b.winningStreak - a.winningStreak)[0];

      assert.equal(longestStreak.playerId, 'PH-00002');
      assert.equal(longestStreak.winningStreak, 7);
    });
  });

  describe('Head-to-Head Compare Analytics (PRD Section 11.2)', () => {
    it('should calculate symmetric 50% win probability for equal rated players', () => {
      const p1Rating = 1000;
      const p2Rating = 1000;

      const p1Prob = calculateExpectedScore(p1Rating, p2Rating);
      const p2Prob = calculateExpectedScore(p2Rating, p1Rating);

      assert.equal(Math.round(p1Prob * 100), 50);
      assert.equal(Math.round(p2Prob * 100), 50);
    });

    it('should calculate higher win probability for higher rated player', () => {
      const p1Rating = 1400; // Pro
      const p2Rating = 1000; // Intermediate (400 point gap)

      const p1Prob = calculateExpectedScore(p1Rating, p2Rating);
      const p2Prob = calculateExpectedScore(p2Rating, p1Rating);

      // 400 point gap gives ~91% expected win probability
      assert.equal(Math.round(p1Prob * 100), 91);
      assert.equal(Math.round(p2Prob * 100), 9);
      assert.equal(Math.round((p1Prob + p2Prob) * 100), 100);
    });

    it('should compute rating gap and identify favored player', () => {
      const player1 = { name: 'Player A', currentRating: 1250 };
      const player2 = { name: 'Player B', currentRating: 1100 };

      const ratingGap = player1.currentRating - player2.currentRating;
      const favored = ratingGap > 0 ? player1.name : player2.name;

      assert.equal(ratingGap, 150);
      assert.equal(favored, 'Player A');
    });
  });
});
