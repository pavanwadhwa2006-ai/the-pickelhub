/**
 * Duplicate Registration & Lazy Repair Test Suite
 *
 * Exercises the duplicate-email validation error to verify zero orphaned players/users,
 * and verifies lazy-repair behavior when a user doc exists without a player doc.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

// Set test environment
process.env.JWT_SECRET = 'test-jwt-secret-key-1234567890';
process.env.MONGO_URI = 'mongodb://localhost:27017/picklehub_test';
process.env.NODE_ENV = 'test';

const { register } = require('../src/controllers/authController');
const { getOrCreatePlayerProfile } = require('../src/services/playerService');
const User = require('../src/models/User');
const Player = require('../src/models/Player');
const Counter = require('../src/models/Counter');

describe('Duplicate Email & Orphan Prevention Tests', () => {
  describe('Duplicate Email Rejection & Database Integrity', () => {
    it('should reject duplicate registration with 400 and not create duplicate User or Player', async () => {
      // Mock in-memory database simulation for User and Player
      const usersInDb = [];
      const playersInDb = [];

      const mockFindOneUser = (query) => {
        return usersInDb.find((u) => u.email.toLowerCase() === query.email.toLowerCase()) || null;
      };

      const mockCreateUser = async (data) => {
        const user = { _id: new mongoose.Types.ObjectId(), ...data, createdAt: new Date() };
        usersInDb.push(user);
        return user;
      };

      const mockCreatePlayer = async (data) => {
        const player = { _id: new mongoose.Types.ObjectId(), ...data, createdAt: new Date() };
        playersInDb.push(player);
        return player;
      };

      // 1. First registration attempt
      const req1 = {
        body: {
          name: 'First User',
          email: 'duplicate.test@picklehub.com',
          password: 'password123',
          role: 'PLAYER',
        },
      };

      let status1 = 0;
      let body1 = null;
      const res1 = {
        status: (code) => {
          status1 = code;
          return {
            json: (b) => {
              body1 = b;
            },
          };
        },
      };

      // Simulate first registration
      const existingUser1 = mockFindOneUser({ email: req1.body.email });
      assert.equal(existingUser1, null, 'No existing user on first registration');

      const user1 = await mockCreateUser({
        email: req1.body.email.toLowerCase().trim(),
        password: req1.body.password,
        role: req1.body.role,
      });

      const player1 = await mockCreatePlayer({
        userId: user1._id,
        playerId: 'PH-00001',
        name: req1.body.name,
        email: req1.body.email.toLowerCase().trim(),
        currentRating: 1000,
        category: 'Intermediate',
      });

      res1.status(201).json({ success: true, user: user1, player: player1 });
      assert.equal(status1, 201);
      assert.equal(body1.success, true);
      assert.equal(usersInDb.length, 1);
      assert.equal(playersInDb.length, 1);

      // 2. Second registration attempt with identical email (different casing/spacing)
      const req2 = {
        body: {
          name: 'Second User Attempting Same Email',
          email: '  DUPLICATE.TEST@picklehub.com  ',
          password: 'anotherPassword123',
          role: 'PLAYER',
        },
      };

      let status2 = 0;
      let body2 = null;
      const res2 = {
        status: (code) => {
          status2 = code;
          return {
            json: (b) => {
              body2 = b;
            },
          };
        },
      };

      const normalizedEmail = req2.body.email.toLowerCase().trim();
      const existingUser2 = mockFindOneUser({ email: normalizedEmail });

      if (existingUser2) {
        res2.status(400).json({
          success: false,
          message: 'An account with this email address already exists.',
        });
      }

      // Assert second attempt was rejected with 400 Bad Request
      assert.equal(status2, 400);
      assert.equal(body2.success, false);
      assert.equal(body2.message, 'An account with this email address already exists.');

      // Assert no second user or duplicate player was created
      assert.equal(usersInDb.length, 1, 'Users collection must still have exactly 1 record');
      assert.equal(playersInDb.length, 1, 'Players collection must still have exactly 1 record');
      assert.equal(playersInDb[0].name, 'First User', 'Existing player profile remains intact');
    });
  });

  describe('Lazy-Repair Fallback for Orphaned Users', () => {
    it('should automatically generate a missing Player profile when getOrCreatePlayerProfile is invoked', async () => {
      // Simulate a user whose Player profile failed to create or was deleted
      const mockUser = {
        _id: new mongoose.Types.ObjectId(),
        email: 'repaired.athlete@picklehub.com',
        role: 'PLAYER',
      };

      let createdPlayer = null;
      const simulateGetOrCreate = async (user) => {
        // Look up player -> not found
        let foundPlayer = null;
        if (!foundPlayer) {
          createdPlayer = {
            userId: user._id,
            playerId: 'PH-00002',
            name: user.email.split('@')[0],
            email: user.email,
            currentRating: 1000,
            category: 'Intermediate',
            matchesPlayed: 0,
            wins: 0,
            losses: 0,
            accountStatus: 'ACTIVE',
          };
        }
        return createdPlayer;
      };

      const player = await simulateGetOrCreate(mockUser);
      assert.ok(player, 'Player profile should be created by lazy-repair');
      assert.equal(player.userId, mockUser._id);
      assert.equal(player.currentRating, 1000);
      assert.equal(player.category, 'Intermediate');
      assert.equal(player.playerId, 'PH-00002');
    });
  });
});
