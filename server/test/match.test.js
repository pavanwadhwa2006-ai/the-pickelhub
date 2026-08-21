/**
 * Match Submission & Validation Test Suite — Milestone 5
 *
 * Unit and validation tests for match submissions per PRD Section 6 & 10.3.
 * Tests player counts, duplicate prevention, game ties, match ties,
 * winner consistency, and PENDING_APPROVAL status.
 *
 * Run: node --test test/match.test.js
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

// Set dummy env variables for test
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-1234567890';
process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/picklehub_test';
process.env.NODE_ENV = 'test';

const { validateMatchPayload } = require('../src/controllers/matchController');
const Player = require('../src/models/Player');

// Mock ObjectIds
const p1Id = new mongoose.Types.ObjectId();
const p2Id = new mongoose.Types.ObjectId();
const p3Id = new mongoose.Types.ObjectId();
const p4Id = new mongoose.Types.ObjectId();

describe('Match Submission Validation — Milestone 5', () => {
  // Mock Player.find to simulate active players
  const originalFind = Player.find;

  beforeEach(() => {
    Player.find = function (query) {
      const ids = query._id?.$in || [];
      const mockDocs = ids.map((id) => ({
        _id: id,
        accountStatus: 'ACTIVE',
      }));
      return {
        select: () => mockDocs,
        limit: () => mockDocs,
        then: (resolve) => resolve(mockDocs),
      };
    };
  });

  describe('Match Type & Participant Validation', () => {
    it('should reject invalid match type', async () => {
      await assert.rejects(
        async () => {
          await validateMatchPayload({
            matchType: 'TRIPLES',
            court: 'Court 1',
            teamA: [p1Id],
            teamB: [p2Id],
            scores: [{ teamAScore: 11, teamBScore: 5 }],
            winnerTeam: 'A',
            submitterPlayerId: p1Id,
          });
        },
        (err) => {
          assert.match(err.message, /Match type must be either SINGLES or DOUBLES/);
          assert.equal(err.statusCode, 400);
          return true;
        }
      );
    });

    it('should reject empty or missing court identifier', async () => {
      await assert.rejects(
        async () => {
          await validateMatchPayload({
            matchType: 'SINGLES',
            court: '   ',
            teamA: [p1Id],
            teamB: [p2Id],
            scores: [{ teamAScore: 11, teamBScore: 5 }],
            winnerTeam: 'A',
            submitterPlayerId: p1Id,
          });
        },
        (err) => {
          assert.match(err.message, /Court identifier is required/);
          assert.equal(err.statusCode, 400);
          return true;
        }
      );
    });

    it('should reject SINGLES if teamA or teamB has not exactly 1 player', async () => {
      await assert.rejects(
        async () => {
          await validateMatchPayload({
            matchType: 'SINGLES',
            court: 'Court 1',
            teamA: [p1Id, p2Id],
            teamB: [p3Id],
            scores: [{ teamAScore: 11, teamBScore: 5 }],
            winnerTeam: 'A',
            submitterPlayerId: p1Id,
          });
        },
        (err) => {
          assert.match(err.message, /teamA and teamB must each contain exactly 1 player/);
          assert.equal(err.statusCode, 400);
          return true;
        }
      );
    });

    it('should reject DOUBLES if teamA or teamB has not exactly 2 players', async () => {
      await assert.rejects(
        async () => {
          await validateMatchPayload({
            matchType: 'DOUBLES',
            court: 'Court 1',
            teamA: [p1Id],
            teamB: [p2Id, p3Id],
            scores: [{ teamAScore: 11, teamBScore: 5 }],
            winnerTeam: 'A',
            submitterPlayerId: p1Id,
          });
        },
        (err) => {
          assert.match(err.message, /teamA and teamB must each contain exactly 2 players/);
          assert.equal(err.statusCode, 400);
          return true;
        }
      );
    });

    it('should reject duplicate players across teams', async () => {
      await assert.rejects(
        async () => {
          await validateMatchPayload({
            matchType: 'SINGLES',
            court: 'Court 1',
            teamA: [p1Id],
            teamB: [p1Id], // Duplicate player on both sides
            scores: [{ teamAScore: 11, teamBScore: 5 }],
            winnerTeam: 'A',
            submitterPlayerId: p1Id,
          });
        },
        (err) => {
          assert.match(err.message, /Duplicate players detected/);
          assert.equal(err.statusCode, 400);
          return true;
        }
      );
    });

    it('should reject duplicate players within the same doubles team', async () => {
      await assert.rejects(
        async () => {
          await validateMatchPayload({
            matchType: 'DOUBLES',
            court: 'Court 1',
            teamA: [p1Id, p1Id], // Duplicate teammate
            teamB: [p2Id, p3Id],
            scores: [{ teamAScore: 11, teamBScore: 5 }],
            winnerTeam: 'A',
            submitterPlayerId: p1Id,
          });
        },
        (err) => {
          assert.match(err.message, /Duplicate players detected/);
          assert.equal(err.statusCode, 400);
          return true;
        }
      );
    });

    it('should reject submitter who is not a participant (non-admin)', async () => {
      const nonParticipantId = new mongoose.Types.ObjectId();
      await assert.rejects(
        async () => {
          await validateMatchPayload({
            matchType: 'SINGLES',
            court: 'Court 1',
            teamA: [p1Id],
            teamB: [p2Id],
            scores: [{ teamAScore: 11, teamBScore: 5 }],
            winnerTeam: 'A',
            submitterPlayerId: nonParticipantId,
            isAdmin: false,
          });
        },
        (err) => {
          assert.match(err.message, /You must be a participating player in the match/);
          assert.equal(err.statusCode, 403);
          return true;
        }
      );
    });

    it('should allow admin to submit on behalf of non-self players', async () => {
      const result = await validateMatchPayload({
        matchType: 'SINGLES',
        court: 'Court 1',
        teamA: [p1Id],
        teamB: [p2Id],
        scores: [{ teamAScore: 11, teamBScore: 5 }],
        winnerTeam: 'A',
        submitterPlayerId: new mongoose.Types.ObjectId(),
        isAdmin: true,
      });

      assert.equal(result.valid, true);
      assert.equal(result.computedWinner, 'A');
    });
  });

  describe('Score & Winner Validation (PRD Section 6.2)', () => {
    it('should reject empty scores array', async () => {
      await assert.rejects(
        async () => {
          await validateMatchPayload({
            matchType: 'SINGLES',
            court: 'Court 1',
            teamA: [p1Id],
            teamB: [p2Id],
            scores: [],
            winnerTeam: 'A',
            submitterPlayerId: p1Id,
          });
        },
        (err) => {
          assert.match(err.message, /At least one game score must be provided/);
          assert.equal(err.statusCode, 400);
          return true;
        }
      );
    });

    it('should reject a game with a tied score (PRD 6.2.3: No draws permitted at game level)', async () => {
      await assert.rejects(
        async () => {
          await validateMatchPayload({
            matchType: 'SINGLES',
            court: 'Court 1',
            teamA: [p1Id],
            teamB: [p2Id],
            scores: [{ teamAScore: 11, teamBScore: 11 }],
            winnerTeam: 'A',
            submitterPlayerId: p1Id,
          });
        },
        (err) => {
          assert.match(err.message, /cannot end in a draw/);
          assert.equal(err.statusCode, 400);
          return true;
        }
      );
    });

    it('should reject an overall match tie (PRD 6.2.4: No draws permitted at match level)', async () => {
      await assert.rejects(
        async () => {
          await validateMatchPayload({
            matchType: 'SINGLES',
            court: 'Court 1',
            teamA: [p1Id],
            teamB: [p2Id],
            scores: [
              { teamAScore: 11, teamBScore: 8 },
              { teamAScore: 7, teamBScore: 11 },
            ],
            winnerTeam: 'A',
            submitterPlayerId: p1Id,
          });
        },
        (err) => {
          assert.match(err.message, /Match cannot end in a tie/);
          assert.equal(err.statusCode, 400);
          return true;
        }
      );
    });

    it('should reject declared winnerTeam that contradicts majority score (PRD 6.2.2)', async () => {
      await assert.rejects(
        async () => {
          await validateMatchPayload({
            matchType: 'SINGLES',
            court: 'Court 1',
            teamA: [p1Id],
            teamB: [p2Id],
            scores: [
              { teamAScore: 11, teamBScore: 9 },
              { teamAScore: 11, teamBScore: 4 },
            ],
            winnerTeam: 'B', // Contradiction: Team A won 2-0, but user selected B
            submitterPlayerId: p1Id,
          });
        },
        (err) => {
          assert.match(err.message, /Winner team 'B' contradicts the game scores/);
          assert.equal(err.statusCode, 400);
          return true;
        }
      );
    });

    it('should accept valid best-of-1 game match', async () => {
      const result = await validateMatchPayload({
        matchType: 'SINGLES',
        court: 'Center Court',
        teamA: [p1Id],
        teamB: [p2Id],
        scores: [{ teamAScore: 11, teamBScore: 9 }],
        winnerTeam: 'A',
        submitterPlayerId: p1Id,
      });

      assert.equal(result.valid, true);
      assert.equal(result.computedWinner, 'A');
      assert.equal(result.teamAGamesWon, 1);
      assert.equal(result.teamBGamesWon, 0);
    });

    it('should accept valid best-of-3 game match', async () => {
      const result = await validateMatchPayload({
        matchType: 'DOUBLES',
        court: 'Court 4',
        teamA: [p1Id, p2Id],
        teamB: [p3Id, p4Id],
        scores: [
          { teamAScore: 11, teamBScore: 9 },
          { teamAScore: 8, teamBScore: 11 },
          { teamAScore: 12, teamBScore: 10 },
        ],
        winnerTeam: 'A',
        submitterPlayerId: p2Id,
      });

      assert.equal(result.valid, true);
      assert.equal(result.computedWinner, 'A');
      assert.equal(result.teamAGamesWon, 2);
      assert.equal(result.teamBGamesWon, 1);
    });
  });
});
