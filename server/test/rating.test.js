/**
 * Rating Engine Test Suite — Milestone 4
 *
 * Comprehensive unit tests for the Elo calculation service.
 * Covers singles wins/losses, doubles weighted-delta distribution,
 * edge cases, and configuration.
 *
 * Run: node --test test/rating.test.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// Set dummy env variables for test (before requiring the service)
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-1234567890';
process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/picklehub_test';
process.env.NODE_ENV = 'test';

const {
  calculateExpectedScore,
  calculateRatingDelta,
  calculateNewRating,
  calculateSinglesRatingChanges,
  calculateDoublesRatingChanges,
  calculateMatchRatingChanges,
} = require('../src/services/ratingService');

// Helper: generate a mock player object
const mockPlayer = (id, rating) => ({
  _id: id,
  currentRating: rating,
});

describe('Rating Engine Tests (Milestone 4)', () => {
  // ──────────────────────────────────────────────
  // Core Elo Primitives
  // ──────────────────────────────────────────────

  describe('calculateExpectedScore (PRD Section 7.1)', () => {
    it('should return 0.5 for equal-rated players', () => {
      const expected = calculateExpectedScore(1000, 1000);
      assert.equal(expected, 0.5);
    });

    it('should return higher expected score for higher-rated player', () => {
      const expected = calculateExpectedScore(1200, 1000);
      assert.ok(expected > 0.5, `Expected > 0.5 but got ${expected}`);
      assert.ok(expected < 1.0, `Expected < 1.0 but got ${expected}`);
    });

    it('should return lower expected score for lower-rated player', () => {
      const expected = calculateExpectedScore(1000, 1200);
      assert.ok(expected < 0.5, `Expected < 0.5 but got ${expected}`);
      assert.ok(expected > 0.0, `Expected > 0.0 but got ${expected}`);
    });

    it('should return complementary scores (E_A + E_B ≈ 1.0)', () => {
      const eA = calculateExpectedScore(1200, 1000);
      const eB = calculateExpectedScore(1000, 1200);
      assert.ok(
        Math.abs(eA + eB - 1.0) < 1e-10,
        `Expected scores should sum to 1.0 but got ${eA + eB}`
      );
    });

    it('should approach 1.0 for extreme rating advantage', () => {
      const expected = calculateExpectedScore(2000, 800);
      assert.ok(expected > 0.99, `Expected > 0.99 but got ${expected}`);
    });

    it('should approach 0.0 for extreme rating disadvantage', () => {
      const expected = calculateExpectedScore(800, 2000);
      assert.ok(expected < 0.01, `Expected < 0.01 but got ${expected}`);
    });

    it('should handle a 400-point gap correctly (expected ≈ 0.9091)', () => {
      // With 400-point gap: E = 1/(1 + 10^(-1)) = 1/(1+0.1) ≈ 0.9091
      const expected = calculateExpectedScore(1400, 1000);
      assert.ok(
        Math.abs(expected - 10 / 11) < 1e-10,
        `Expected ≈ 0.9091 but got ${expected}`
      );
    });
  });

  describe('calculateRatingDelta', () => {
    it('should return positive delta for a win', () => {
      const delta = calculateRatingDelta(1000, 1000, 1, 32);
      assert.ok(delta > 0, `Expected positive delta but got ${delta}`);
    });

    it('should return negative delta for a loss', () => {
      const delta = calculateRatingDelta(1000, 1000, 0, 32);
      assert.ok(delta < 0, `Expected negative delta but got ${delta}`);
    });

    it('should return ±16 for equal-rated players with K=32', () => {
      const winDelta = calculateRatingDelta(1000, 1000, 1, 32);
      const lossDelta = calculateRatingDelta(1000, 1000, 0, 32);
      assert.ok(Math.abs(winDelta - 16) < 1e-10, `Expected +16 but got ${winDelta}`);
      assert.ok(Math.abs(lossDelta + 16) < 1e-10, `Expected -16 but got ${lossDelta}`);
    });

    it('should return smaller gain for expected win (higher rated wins)', () => {
      const delta = calculateRatingDelta(1400, 1000, 1, 32);
      assert.ok(delta > 0 && delta < 16, `Expected small positive delta but got ${delta}`);
    });

    it('should return larger gain for upset win (lower rated wins)', () => {
      const delta = calculateRatingDelta(1000, 1400, 1, 32);
      assert.ok(delta > 16, `Expected large positive delta (>16) but got ${delta}`);
    });

    it('should return zero delta with K-factor of 0', () => {
      const delta = calculateRatingDelta(1000, 1200, 1, 0);
      assert.equal(delta, 0);
    });

    it('should scale linearly with K-factor', () => {
      const delta32 = calculateRatingDelta(1000, 1000, 1, 32);
      const delta64 = calculateRatingDelta(1000, 1000, 1, 64);
      assert.ok(
        Math.abs(delta64 - 2 * delta32) < 1e-10,
        `K=64 delta should be 2× K=32 delta`
      );
    });

    it('should use default K-factor (32) when not specified', () => {
      const deltaExplicit = calculateRatingDelta(1000, 1000, 1, 32);
      const deltaDefault = calculateRatingDelta(1000, 1000, 1);
      assert.ok(
        Math.abs(deltaExplicit - deltaDefault) < 1e-10,
        'Default K-factor should produce same result as K=32'
      );
    });
  });

  describe('calculateNewRating', () => {
    it('should add positive delta correctly', () => {
      assert.equal(calculateNewRating(1000, 16), 1016);
    });

    it('should subtract negative delta correctly', () => {
      assert.equal(calculateNewRating(1000, -16), 984);
    });

    it('should floor at 0 (ratings cannot go negative)', () => {
      assert.equal(calculateNewRating(10, -50), 0);
      assert.equal(calculateNewRating(0, -100), 0);
    });

    it('should round to nearest integer', () => {
      assert.equal(calculateNewRating(1000, 16.7), 1017);
      assert.equal(calculateNewRating(1000, 16.3), 1016);
    });
  });

  // ──────────────────────────────────────────────
  // Singles Match Scenarios
  // ──────────────────────────────────────────────

  describe('calculateSinglesRatingChanges', () => {
    it('should produce symmetric deltas for equal-rated players (K=32)', () => {
      const changes = calculateSinglesRatingChanges({
        playerA: mockPlayer('A', 1000),
        playerB: mockPlayer('B', 1000),
        winnerSide: 'A',
        kFactor: 32,
      });

      assert.equal(changes.length, 2);

      const [changeA, changeB] = changes;
      assert.equal(changeA.playerId, 'A');
      assert.equal(changeB.playerId, 'B');

      // Winner gains 16, loser loses 16
      assert.equal(changeA.newRating, 1016);
      assert.equal(changeB.newRating, 984);
      assert.equal(changeA.delta, 16);
      assert.equal(changeB.delta, -16);

      // Symmetry: |delta_A| === |delta_B|
      assert.equal(Math.abs(changeA.delta), Math.abs(changeB.delta));
    });

    it('should produce smaller gain when higher-rated player wins (expected result)', () => {
      const changes = calculateSinglesRatingChanges({
        playerA: mockPlayer('A', 1400),
        playerB: mockPlayer('B', 1000),
        winnerSide: 'A',
        kFactor: 32,
      });

      const [changeA, changeB] = changes;

      // Winner's gain should be less than 16 (expected outcome)
      assert.ok(changeA.delta > 0 && changeA.delta < 16,
        `Expected small gain but got ${changeA.delta}`);
      // Loser's loss should be small
      assert.ok(changeB.delta < 0 && changeB.delta > -16,
        `Expected small loss but got ${changeB.delta}`);
    });

    it('should produce larger gain when lower-rated player wins (upset)', () => {
      const changes = calculateSinglesRatingChanges({
        playerA: mockPlayer('A', 1000),
        playerB: mockPlayer('B', 1400),
        winnerSide: 'A',
        kFactor: 32,
      });

      const [changeA, changeB] = changes;

      // Winner's gain should be more than 16 (upset)
      assert.ok(changeA.delta > 16,
        `Expected large gain but got ${changeA.delta}`);
      // Loser's loss should be large
      assert.ok(changeB.delta < -16,
        `Expected large loss but got ${changeB.delta}`);
    });

    it('should handle winnerSide "B" correctly', () => {
      const changes = calculateSinglesRatingChanges({
        playerA: mockPlayer('A', 1000),
        playerB: mockPlayer('B', 1000),
        winnerSide: 'B',
        kFactor: 32,
      });

      const [changeA, changeB] = changes;
      assert.equal(changeA.delta, -16, 'Player A should lose 16');
      assert.equal(changeB.delta, 16, 'Player B should gain 16');
    });

    it('should return oldRating fields matching input ratings', () => {
      const changes = calculateSinglesRatingChanges({
        playerA: mockPlayer('A', 1234),
        playerB: mockPlayer('B', 987),
        winnerSide: 'A',
        kFactor: 32,
      });

      assert.equal(changes[0].oldRating, 1234);
      assert.equal(changes[1].oldRating, 987);
    });

    it('should produce near-zero gain for extreme rating gap (expected win)', () => {
      const changes = calculateSinglesRatingChanges({
        playerA: mockPlayer('A', 2000),
        playerB: mockPlayer('B', 800),
        winnerSide: 'A',
        kFactor: 32,
      });

      const [changeA] = changes;
      // With 1200-point gap, expected score ≈ 0.9968, delta ≈ 0.1
      assert.ok(changeA.delta >= 0 && changeA.delta <= 2,
        `Expected near-zero gain but got ${changeA.delta}`);
    });

    it('should produce near-K gain for extreme rating gap (upset win)', () => {
      const changes = calculateSinglesRatingChanges({
        playerA: mockPlayer('A', 800),
        playerB: mockPlayer('B', 2000),
        winnerSide: 'A',
        kFactor: 32,
      });

      const [changeA] = changes;
      // With 1200-point gap, expected score ≈ 0.003, delta ≈ 31.9
      assert.ok(changeA.delta >= 30,
        `Expected near-K gain but got ${changeA.delta}`);
    });
  });

  // ──────────────────────────────────────────────
  // Doubles Match Scenarios (PRD Section 7.2)
  // ──────────────────────────────────────────────

  describe('calculateDoublesRatingChanges (PRD Section 7.2)', () => {
    it('should return 4 entries (one per player)', () => {
      const changes = calculateDoublesRatingChanges({
        teamA: [mockPlayer('A1', 1000), mockPlayer('A2', 1000)],
        teamB: [mockPlayer('B1', 1000), mockPlayer('B2', 1000)],
        winnerTeam: 'A',
        kFactor: 32,
      });

      assert.equal(changes.length, 4);
    });

    it('should produce equal deltas for equal-rated teams with equal-rated players', () => {
      const changes = calculateDoublesRatingChanges({
        teamA: [mockPlayer('A1', 1000), mockPlayer('A2', 1000)],
        teamB: [mockPlayer('B1', 1000), mockPlayer('B2', 1000)],
        winnerTeam: 'A',
        kFactor: 32,
      });

      // All winners should gain equally, all losers should lose equally
      assert.equal(changes[0].delta, 16, 'A1 should gain 16');
      assert.equal(changes[1].delta, 16, 'A2 should gain 16');
      assert.equal(changes[2].delta, -16, 'B1 should lose 16');
      assert.equal(changes[3].delta, -16, 'B2 should lose 16');
    });

    it('should give weaker player LARGER share of positive delta (win)', () => {
      // Team A: strong (1400) + weak (1000), avg = 1200
      const changes = calculateDoublesRatingChanges({
        teamA: [mockPlayer('strong', 1400), mockPlayer('weak', 1000)],
        teamB: [mockPlayer('B1', 1200), mockPlayer('B2', 1200)],
        winnerTeam: 'A',
        kFactor: 32,
      });

      const strongDelta = changes[0].delta; // strong player (1400, above avg)
      const weakDelta = changes[1].delta;   // weak player (1000, below avg)

      // Weak player should get a larger share of the win
      assert.ok(weakDelta > strongDelta,
        `Weak player delta (${weakDelta}) should be > strong player delta (${strongDelta})`);

      // Both should be positive (team won)
      assert.ok(strongDelta > 0, 'Strong player should still gain');
      assert.ok(weakDelta > 0, 'Weak player should gain more');
    });

    it('should distribute loss delta using PRD weight formula (w = 1 - d/800)', () => {
      // Team A: strong (1400) + weak (1000), avg = 1200
      // Per PRD formula: w_i = clamp(1 - d_i/800, 0.75, 1.25)
      //   strong: d=+200, w=0.75; weak: d=-200, w=1.25
      // When team loses (Δ_Team < 0), higher weight → larger magnitude loss
      const changes = calculateDoublesRatingChanges({
        teamA: [mockPlayer('strong', 1400), mockPlayer('weak', 1000)],
        teamB: [mockPlayer('B1', 1200), mockPlayer('B2', 1200)],
        winnerTeam: 'B',
        kFactor: 32,
      });

      const strongDelta = changes[0].delta; // strong player (1400)
      const weakDelta = changes[1].delta;   // weak player (1000)

      // Both should be negative (team lost)
      assert.ok(strongDelta < 0, 'Strong player should lose');
      assert.ok(weakDelta < 0, 'Weak player should lose');

      // Per the formula, the weaker player has a higher weight (1.25 vs 0.75),
      // so |weak delta| > |strong delta| when team loses
      assert.ok(Math.abs(weakDelta) > Math.abs(strongDelta),
        `Weak player |delta| (${Math.abs(weakDelta)}) should be > strong |delta| (${Math.abs(strongDelta)}) per formula w = 1 - d/800`);
    });

    it('should keep individual weights within [0.75, 1.25] bounds', () => {
      // Extreme case: 2000 + 600, avg = 1300
      // Deviation for 2000: d = 2000-1300 = 700, raw_w = 1 - 700/800 = 0.125 → clamped to 0.75
      // Deviation for 600: d = 600-1300 = -700, raw_w = 1 - (-700)/800 = 1.875 → clamped to 1.25
      const changes = calculateDoublesRatingChanges({
        teamA: [mockPlayer('A1', 2000), mockPlayer('A2', 600)],
        teamB: [mockPlayer('B1', 1300), mockPlayer('B2', 1300)],
        winnerTeam: 'A',
        kFactor: 32,
      });

      // With clamped weights 0.75 and 1.25, normalized: 0.75 and 1.25
      // (sum = 2.0, so normalization = 2*w/2 = w — already normalized)
      const deltaA1 = changes[0].delta;
      const deltaA2 = changes[1].delta;

      // Weaker player (600) should get 1.25× share, stronger (2000) gets 0.75×
      assert.ok(deltaA2 > deltaA1,
        `Weaker player delta (${deltaA2}) should be > stronger (${deltaA1})`);
    });

    it('should ensure average of team deltas equals the team delta', () => {
      const changes = calculateDoublesRatingChanges({
        teamA: [mockPlayer('A1', 1300), mockPlayer('A2', 1100)],
        teamB: [mockPlayer('B1', 1200), mockPlayer('B2', 1200)],
        winnerTeam: 'A',
        kFactor: 32,
      });

      const deltaA1 = changes[0].delta;
      const deltaA2 = changes[1].delta;

      // Team avg = 1200 for both teams, so expected = 0.5, team delta = 16
      // Average of individual deltas should ≈ 16
      const avgDelta = (deltaA1 + deltaA2) / 2;
      assert.ok(Math.abs(avgDelta - 16) <= 1,
        `Average of individual deltas (${avgDelta}) should ≈ team delta (16)`);
    });

    it('should handle winnerTeam "B" correctly', () => {
      const changes = calculateDoublesRatingChanges({
        teamA: [mockPlayer('A1', 1000), mockPlayer('A2', 1000)],
        teamB: [mockPlayer('B1', 1000), mockPlayer('B2', 1000)],
        winnerTeam: 'B',
        kFactor: 32,
      });

      // Team A should lose, Team B should gain
      assert.equal(changes[0].delta, -16, 'A1 should lose');
      assert.equal(changes[1].delta, -16, 'A2 should lose');
      assert.equal(changes[2].delta, 16, 'B1 should gain');
      assert.equal(changes[3].delta, 16, 'B2 should gain');
    });

    it('should preserve oldRating for all 4 players', () => {
      const changes = calculateDoublesRatingChanges({
        teamA: [mockPlayer('A1', 1100), mockPlayer('A2', 900)],
        teamB: [mockPlayer('B1', 1050), mockPlayer('B2', 950)],
        winnerTeam: 'A',
        kFactor: 32,
      });

      assert.equal(changes[0].oldRating, 1100);
      assert.equal(changes[1].oldRating, 900);
      assert.equal(changes[2].oldRating, 1050);
      assert.equal(changes[3].oldRating, 950);
    });
  });

  // ──────────────────────────────────────────────
  // Unified Dispatcher
  // ──────────────────────────────────────────────

  describe('calculateMatchRatingChanges (dispatcher)', () => {
    it('should route SINGLES to singles logic', () => {
      const changes = calculateMatchRatingChanges({
        matchType: 'SINGLES',
        teamA: [mockPlayer('A', 1000)],
        teamB: [mockPlayer('B', 1000)],
        winnerTeam: 'A',
        kFactor: 32,
      });

      assert.equal(changes.length, 2);
      assert.equal(changes[0].delta, 16);
      assert.equal(changes[1].delta, -16);
    });

    it('should route DOUBLES to doubles logic', () => {
      const changes = calculateMatchRatingChanges({
        matchType: 'DOUBLES',
        teamA: [mockPlayer('A1', 1000), mockPlayer('A2', 1000)],
        teamB: [mockPlayer('B1', 1000), mockPlayer('B2', 1000)],
        winnerTeam: 'A',
        kFactor: 32,
      });

      assert.equal(changes.length, 4);
    });

    it('should throw for unsupported match type', () => {
      assert.throws(
        () => calculateMatchRatingChanges({
          matchType: 'MIXED_TRIPLES',
          teamA: [mockPlayer('A', 1000)],
          teamB: [mockPlayer('B', 1000)],
          winnerTeam: 'A',
        }),
        /Unsupported match type/
      );
    });
  });

  // ──────────────────────────────────────────────
  // Edge Cases
  // ──────────────────────────────────────────────

  describe('Edge Cases', () => {
    it('should floor rating at 0 in singles (cannot go negative)', () => {
      // Use a large K-factor to force a delta that would push below 0
      const changes = calculateSinglesRatingChanges({
        playerA: mockPlayer('A', 5),
        playerB: mockPlayer('B', 5),
        winnerSide: 'B',
        kFactor: 100,
      });

      // Player A loses 50 points from rating 5 — should floor at 0
      assert.equal(changes[0].newRating, 0,
        `Rating should floor at 0, got ${changes[0].newRating}`);
      assert.ok(changes[0].newRating >= 0, 'Rating must not be negative');
    });

    it('should floor rating at 0 in doubles (cannot go negative)', () => {
      const changes = calculateDoublesRatingChanges({
        teamA: [mockPlayer('A1', 3), mockPlayer('A2', 3)],
        teamB: [mockPlayer('B1', 3), mockPlayer('B2', 3)],
        winnerTeam: 'B',
        kFactor: 100,
      });

      assert.equal(changes[0].newRating, 0, 'A1 should floor at 0');
      assert.equal(changes[1].newRating, 0, 'A2 should floor at 0');
    });

    it('should produce zero deltas with K-factor 0', () => {
      const changes = calculateSinglesRatingChanges({
        playerA: mockPlayer('A', 1000),
        playerB: mockPlayer('B', 1000),
        winnerSide: 'A',
        kFactor: 0,
      });

      // Math.round(0 * x) can produce -0 in JS; use Object.is for comparison
      assert.ok(changes[0].delta === 0 || Object.is(changes[0].delta, -0), 'Winner delta should be 0');
      assert.ok(changes[1].delta === 0 || Object.is(changes[1].delta, -0), 'Loser delta should be 0');
      assert.equal(changes[0].newRating, 1000);
      assert.equal(changes[1].newRating, 1000);
    });

    it('should handle very large K-factor correctly', () => {
      const changes = calculateSinglesRatingChanges({
        playerA: mockPlayer('A', 1000),
        playerB: mockPlayer('B', 1000),
        winnerSide: 'A',
        kFactor: 100,
      });

      // With K=100, equal ratings: delta = 100 × (1 - 0.5) = 50
      assert.equal(changes[0].delta, 50);
      assert.equal(changes[1].delta, -50);
    });

    it('should handle rating of 0 correctly', () => {
      const changes = calculateSinglesRatingChanges({
        playerA: mockPlayer('A', 0),
        playerB: mockPlayer('B', 1000),
        winnerSide: 'A',
        kFactor: 32,
      });

      // Huge upset — should gain close to K
      assert.ok(changes[0].delta > 28,
        `Expected large gain from rating 0, got ${changes[0].delta}`);
    });
  });

  // ──────────────────────────────────────────────
  // Configuration
  // ──────────────────────────────────────────────

  describe('Configuration', () => {
    it('should use default K-factor of 32 from env config', () => {
      // calculateSinglesRatingChanges without explicit kFactor
      const changes = calculateSinglesRatingChanges({
        playerA: mockPlayer('A', 1000),
        playerB: mockPlayer('B', 1000),
        winnerSide: 'A',
      });

      // Default K=32, equal ratings → delta = 16
      assert.equal(changes[0].delta, 16,
        'Default K-factor should be 32 (delta = 16 for equal ratings)');
    });

    it('should allow kFactor override per call', () => {
      const changes = calculateSinglesRatingChanges({
        playerA: mockPlayer('A', 1000),
        playerB: mockPlayer('B', 1000),
        winnerSide: 'A',
        kFactor: 64,
      });

      assert.equal(changes[0].delta, 32,
        'K=64 should produce delta=32 for equal ratings');
    });
  });
});
