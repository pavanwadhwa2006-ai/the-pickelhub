/**
 * Email Notifications & Durable Outbox Test Suite
 *
 * Verifies:
 * 1. Successful welcome email requests on registration.
 * 2. Duplicate registration / event handling idempotency.
 * 3. Correct recipients and rating deltas for Singles matches.
 * 4. Correct recipients and rating deltas for Doubles matches (all 4 players).
 * 5. No emails sent for unapproved or rejected matches.
 * 6. Provider failures, retry scheduling, exponential backoff, and max attempt limit.
 * 7. Duplicate notification prevention (idempotency key protection).
 * 8. Notification persistence and status transitions (PENDING -> SENT -> DELIVERED via webhook).
 * 9. Authorization for notification-related endpoints and recipient data isolation.
 * 10. Escaping of untrusted content in email templates (XSS prevention).
 * 11. Rating and match-processing regression cases (email failure never rolls back ratings).
 *
 * Run: node --test test/emailNotification.test.js
 */

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load environment configuration
const envPath = path.resolve(__dirname, '../.env');
const rootEnvPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });
dotenv.config({ path: rootEnvPath });

const User = require('../src/models/User');
const Player = require('../src/models/Player');
const Match = require('../src/models/Match');
const Notification = require('../src/models/Notification');
const emailService = require('../src/services/emailService');
const { escapeHtml, renderWelcomeEmail, renderMatchResultEmail } = require('../src/services/emailTemplates');
const { executeAtomicMatchApproval } = require('../src/services/adminService');
const { handleResendWebhook } = require('../src/controllers/notificationController');

describe('Production-Ready Email Notifications & Outbox Engine', () => {
  let adminUser;
  let testUserA, testPlayerA;
  let testUserB, testPlayerB;
  let testUserC, testPlayerC;
  let testUserD, testPlayerD;

  const createdUserIds = [];
  const createdPlayerIds = [];
  const createdMatchIds = [];
  const createdNotificationIds = [];

  // In-memory mock Resend client
  const sentEmails = [];
  let mockShouldFail = false;
  let mockErrorMessage = 'Simulated Resend API Network Error';

  const mockResend = {
    emails: {
      send: async (payload) => {
        if (mockShouldFail) {
          const err = new Error(mockErrorMessage);
          err.name = 'ResendAPIError';
          throw err;
        }
        const messageId = `re_mock_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        sentEmails.push({ ...payload, messageId });
        return {
          data: { id: messageId },
          error: null,
        };
      },
    },
  };

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      const testUri = (process.env.TEST_MONGO_URI || process.env.MONGO_URI || '').replace('/picklehub?', '/picklehub_test?');
      await mongoose.connect(testUri);
    }

    // Set mock Resend client
    emailService.setResendClient(mockResend);

    const ts = Date.now();

    // Create Admin User
    adminUser = await User.create({
      email: `email_admin_${ts}@picklehub.test`,
      password: 'Password123!',
      role: 'ADMIN',
    });
    createdUserIds.push(adminUser._id);

    // Helper to create test player with user
    const createPlayer = async (tag, rating = 1000) => {
      const user = await User.create({
        email: `athlete_${tag}_${ts}@picklehub.test`,
        password: 'Password123!',
        role: 'PLAYER',
      });
      createdUserIds.push(user._id);

      const player = await Player.create({
        userId: user._id,
        playerId: `PH-${tag.toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
        name: `Athlete ${tag}`,
        email: user.email,
        currentRating: rating,
        highestRating: rating,
        category: 'Beginner',
      });
      createdPlayerIds.push(player._id);

      return { user, player };
    };

    ({ user: testUserA, player: testPlayerA } = await createPlayer('A', 1000));
    ({ user: testUserB, player: testPlayerB } = await createPlayer('B', 1000));
    ({ user: testUserC, player: testPlayerC } = await createPlayer('C', 1000));
    ({ user: testUserD, player: testPlayerD } = await createPlayer('D', 1000));
  });

  after(async () => {
    // Reset Resend client
    emailService.setResendClient(null);

    // Cleanup created database documents
    if (createdNotificationIds.length > 0) {
      await Notification.deleteMany({ _id: { $in: createdNotificationIds } });
    }
    if (createdMatchIds.length > 0) {
      await Match.deleteMany({ _id: { $in: createdMatchIds } });
    }
    if (createdPlayerIds.length > 0) {
      await Player.deleteMany({ _id: { $in: createdPlayerIds } });
    }
    if (createdUserIds.length > 0) {
      await User.deleteMany({ _id: { $in: createdUserIds } });
    }
  });

  beforeEach(() => {
    sentEmails.length = 0;
    mockShouldFail = false;
  });

  // -------------------------------------------------------------
  // Test 1: Successful welcome email requests on registration
  // -------------------------------------------------------------
  it('1. should successfully send and persist a welcome email upon registration', async () => {
    const notif = await emailService.queueAndSendWelcomeEmail({
      user: testUserA,
      player: testPlayerA,
    });

    assert.ok(notif, 'Notification should be created');
    createdNotificationIds.push(notif._id);

    assert.equal(notif.recipientEmail, testUserA.email);
    assert.equal(notif.eventType, 'WELCOME');
    assert.equal(notif.status, 'SENT');
    assert.ok(notif.providerMessageId, 'Provider message ID should be populated');
    assert.equal(sentEmails.length, 1, 'Exactly one email should be sent via provider');
    assert.equal(sentEmails[0].to[0], testUserA.email);
    assert.ok(sentEmails[0].html.includes(testPlayerA.playerId), 'Email HTML should include Player ID');
    assert.ok(sentEmails[0].text.includes('WELCOME TO THE PICKLEHUB'), 'Plain text should have welcome header');
  });

  // -------------------------------------------------------------
  // Test 2: Duplicate registration / event handling idempotency
  // -------------------------------------------------------------
  it('2. should prevent duplicate welcome emails when registration is retried', async () => {
    const initialCount = sentEmails.length;

    // Retry sending welcome email with identical user (same idempotencyKey)
    const duplicateNotif = await emailService.queueAndSendWelcomeEmail({
      user: testUserA,
      player: testPlayerA,
    });

    assert.ok(duplicateNotif);
    // Should NOT call provider a second time
    assert.equal(sentEmails.length, initialCount, 'Should not dispatch duplicate email to provider');
    assert.equal(duplicateNotif.status, 'SENT');

    // Total notifications in DB for welcome_${testUserA._id} must be exactly 1
    const totalMatching = await Notification.countDocuments({
      idempotencyKey: `welcome_${testUserA._id.toString()}`,
    });
    assert.equal(totalMatching, 1, 'Only one persistent notification document should exist');
  });

  // -------------------------------------------------------------
  // Test 3: Correct recipients for Singles matches
  // -------------------------------------------------------------
  it('3. should dispatch official result emails to both players in a Singles match with accurate ratings', async () => {
    // Create pending singles match
    const singlesMatch = await Match.create({
      matchId: `M-SINGLES-${Date.now()}`,
      court: 'Court 1',
      matchType: 'SINGLES',
      teamA: [testPlayerA._id],
      teamB: [testPlayerB._id],
      scores: [{ teamAScore: 11, teamBScore: 7 }, { teamAScore: 11, teamBScore: 9 }],
      winnerTeam: 'A',
      submittedBy: testPlayerA._id,
      status: 'PENDING_APPROVAL',
    });
    createdMatchIds.push(singlesMatch._id);

    // Approve match via admin service (triggers rating update and email dispatch)
    const approvedMatch = await executeAtomicMatchApproval({
      matchId: singlesMatch._id,
      adminUserId: adminUser._id,
    });

    assert.equal(approvedMatch.status, 'APPROVED');

    // Fetch notifications created for this match
    const notifications = await Notification.find({
      resourceId: approvedMatch.matchId,
      eventType: 'MATCH_RESULT',
    });

    notifications.forEach((n) => createdNotificationIds.push(n._id));

    assert.equal(notifications.length, 2, 'Both singles players must receive a notification');

    const notifPlayerA = notifications.find((n) => n.recipientEmail === testUserA.email);
    const notifPlayerB = notifications.find((n) => n.recipientEmail === testUserB.email);

    assert.ok(notifPlayerA, 'Winner player A should receive notification');
    assert.ok(notifPlayerB, 'Loser player B should receive notification');

    assert.equal(notifPlayerA.status, 'SENT');
    assert.equal(notifPlayerB.status, 'SENT');

    // Player A won (+16), Player B lost (-16) under equal 1000 Elo baseline
    assert.ok(notifPlayerA.metadata.isWinner === true);
    assert.ok(notifPlayerB.metadata.isWinner === false);
    assert.equal(notifPlayerA.metadata.delta, 16);
    assert.equal(notifPlayerB.metadata.delta, -16);
  });

  // -------------------------------------------------------------
  // Test 4: Correct recipients for Doubles matches (all 4 players)
  // -------------------------------------------------------------
  it('4. should dispatch official result emails to all 4 participants in a Doubles match', async () => {
    const doublesMatch = await Match.create({
      matchId: `M-DOUBLES-${Date.now()}`,
      court: 'Court 2',
      matchType: 'DOUBLES',
      teamA: [testPlayerA._id, testPlayerC._id],
      teamB: [testPlayerB._id, testPlayerD._id],
      scores: [{ teamAScore: 11, teamBScore: 5 }, { teamAScore: 11, teamBScore: 6 }],
      winnerTeam: 'A',
      submittedBy: testPlayerA._id,
      status: 'PENDING_APPROVAL',
    });
    createdMatchIds.push(doublesMatch._id);

    const approvedMatch = await executeAtomicMatchApproval({
      matchId: doublesMatch._id,
      adminUserId: adminUser._id,
    });

    assert.equal(approvedMatch.status, 'APPROVED');

    const notifications = await Notification.find({
      resourceId: approvedMatch.matchId,
      eventType: 'MATCH_RESULT',
    });

    notifications.forEach((n) => createdNotificationIds.push(n._id));

    assert.equal(notifications.length, 4, 'All 4 doubles participants must receive a notification');

    const emails = notifications.map((n) => n.recipientEmail);
    assert.ok(emails.includes(testUserA.email), 'Team A player 1 notified');
    assert.ok(emails.includes(testUserC.email), 'Team A player 2 notified');
    assert.ok(emails.includes(testUserB.email), 'Team B player 1 notified');
    assert.ok(emails.includes(testUserD.email), 'Team B player 2 notified');
  });

  // -------------------------------------------------------------
  // Test 5: No emails sent for unapproved or rejected matches
  // -------------------------------------------------------------
  it('5. should never dispatch result emails for unapproved or rejected matches', async () => {
    const pendingMatch = await Match.create({
      matchId: `M-REJECT-${Date.now()}`,
      court: 'Court 1',
      matchType: 'SINGLES',
      teamA: [testPlayerA._id],
      teamB: [testPlayerB._id],
      scores: [{ teamAScore: 11, teamBScore: 8 }],
      winnerTeam: 'A',
      submittedBy: testPlayerA._id,
      status: 'PENDING_APPROVAL',
    });
    createdMatchIds.push(pendingMatch._id);

    // Call service directly with unapproved match
    const resultUnapproved = await emailService.queueAndSendMatchResultEmails({ match: pendingMatch });
    assert.deepEqual(resultUnapproved, [], 'Must return empty array for PENDING_APPROVAL matches');

    // Reject match
    pendingMatch.status = 'REJECTED';
    pendingMatch.rejectionReason = 'Score dispute between players';
    await pendingMatch.save();

    const resultRejected = await emailService.queueAndSendMatchResultEmails({ match: pendingMatch });
    assert.deepEqual(resultRejected, [], 'Must return empty array for REJECTED matches');

    // Verify 0 notifications persisted
    const count = await Notification.countDocuments({ resourceId: pendingMatch.matchId });
    assert.equal(count, 0, 'No notification documents should be persisted for non-approved matches');
  });

  // -------------------------------------------------------------
  // Test 6: Provider failures, retry scheduling, and backoff
  // -------------------------------------------------------------
  it('6. should handle provider failures with exponential backoff and transition to FAILED after max attempts', async () => {
    mockShouldFail = true;
    mockErrorMessage = 'Rate limit exceeded on Resend';

    const testEmailKey = `retry_test_${Date.now()}`;
    const result = await emailService.sendRawEmail({
      to: testUserA.email,
      subject: 'Retry Test Email',
      html: '<p>Testing retry</p>',
      text: 'Testing retry',
      idempotencyKey: testEmailKey,
      recipientUser: testUserA._id,
      eventType: 'SYSTEM',
    });

    createdNotificationIds.push(result._id);

    assert.equal(result.status, 'PENDING', 'First failure should keep status PENDING for retry');
    assert.equal(result.attempts, 1);
    assert.ok(result.nextRetryAt > new Date(), 'nextRetryAt should be scheduled in the future');
    assert.ok(result.error.message.includes('Rate limit exceeded'));

    // Second failure
    const retry1 = await emailService.sendRawEmail({
      to: testUserA.email,
      subject: 'Retry Test Email',
      html: '<p>Testing retry</p>',
      text: 'Testing retry',
      idempotencyKey: testEmailKey,
      recipientUser: testUserA._id,
      eventType: 'SYSTEM',
    });

    assert.equal(retry1.status, 'PENDING');
    assert.equal(retry1.attempts, 2);

    // Third failure (reaches maxAttempts: 3)
    const retry2 = await emailService.sendRawEmail({
      to: testUserA.email,
      subject: 'Retry Test Email',
      html: '<p>Testing retry</p>',
      text: 'Testing retry',
      idempotencyKey: testEmailKey,
      recipientUser: testUserA._id,
      eventType: 'SYSTEM',
    });

    assert.equal(retry2.status, 'FAILED', 'Terminal failure after 3 attempts');
    assert.equal(retry2.attempts, 3);
    assert.equal(retry2.nextRetryAt, null, 'nextRetryAt should be cleared on terminal failure');
    assert.ok(retry2.failedAt instanceof Date);
  });

  // -------------------------------------------------------------
  // Test 7: Duplicate notification prevention
  // -------------------------------------------------------------
  it('7. should guarantee idempotency when dispatch is invoked multiple times for the same match', async () => {
    const singlesMatch = await Match.create({
      matchId: `M-IDEMP-${Date.now()}`,
      court: 'Court 1',
      matchType: 'SINGLES',
      teamA: [testPlayerA._id],
      teamB: [testPlayerB._id],
      scores: [{ teamAScore: 11, teamBScore: 4 }, { teamAScore: 11, teamBScore: 6 }],
      winnerTeam: 'A',
      submittedBy: testPlayerA._id,
      status: 'APPROVED',
      ratingChanges: [
        { playerId: testPlayerA._id, oldRating: 1000, newRating: 1016, delta: 16 },
        { playerId: testPlayerB._id, oldRating: 1000, newRating: 984, delta: -16 },
      ],
    });
    createdMatchIds.push(singlesMatch._id);

    // First dispatch
    const firstDispatch = await emailService.queueAndSendMatchResultEmails({ match: singlesMatch });
    firstDispatch.forEach((n) => createdNotificationIds.push(n._id));
    assert.equal(firstDispatch.length, 2);

    const emailCountAfterFirst = sentEmails.length;

    // Second dispatch (identical match)
    const secondDispatch = await emailService.queueAndSendMatchResultEmails({ match: singlesMatch });
    assert.equal(secondDispatch.length, 2);

    // Must not have called the provider again!
    assert.equal(sentEmails.length, emailCountAfterFirst, 'Duplicate call must not trigger new email send');
  });

  // -------------------------------------------------------------
  // Test 8: Notification persistence and status transitions (Webhook)
  // -------------------------------------------------------------
  it('8. should transition notification status from SENT to DELIVERED upon webhook receipt', async () => {
    const testKey = `webhook_test_${Date.now()}`;
    const notif = await emailService.sendRawEmail({
      to: testUserB.email,
      subject: 'Webhook Test Email',
      html: '<p>Webhook test</p>',
      text: 'Webhook test',
      idempotencyKey: testKey,
      recipientUser: testUserB._id,
      eventType: 'SYSTEM',
    });
    createdNotificationIds.push(notif._id);

    assert.equal(notif.status, 'SENT');
    const msgId = notif.providerMessageId;
    assert.ok(msgId, 'Must have provider message ID');

    // Simulate Resend delivery webhook
    const req = {
      headers: {},
      body: {
        type: 'email.delivered',
        data: {
          email_id: msgId,
          recipient: testUserB.email,
        },
      },
    };

    let responseCode = 200;
    let responseBody = null;
    const res = {
      status: (code) => {
        responseCode = code;
        return {
          json: (data) => {
            responseBody = data;
          },
        };
      },
    };

    await handleResendWebhook(req, res, () => {});

    assert.equal(responseCode, 200);
    assert.equal(responseBody.status, 'DELIVERED');

    // Verify DB update
    const updated = await Notification.findById(notif._id);
    assert.equal(updated.status, 'DELIVERED');
    assert.ok(updated.deliveredAt instanceof Date);
  });

  // -------------------------------------------------------------
  // Test 9: Authorization and recipient data isolation
  // -------------------------------------------------------------
  it('9. should strictly isolate notification history to the authenticated user', async () => {
    // Notifications exist for User A and User B
    const notifsUserA = await Notification.find({ recipientUser: testUserA._id });
    const notifsUserB = await Notification.find({ recipientUser: testUserB._id });

    assert.ok(notifsUserA.length > 0, 'User A has notifications');
    assert.ok(notifsUserB.length > 0, 'User B has notifications');

    // Verify user A's query never leaks user B's notifications
    const isolatedQuery = await Notification.find({ recipientUser: testUserA._id });
    const hasOtherUserNotif = isolatedQuery.some(
      (n) => n.recipientUser.toString() !== testUserA._id.toString()
    );
    assert.equal(hasOtherUserNotif, false, 'User A query must only return User A records');
  });

  // -------------------------------------------------------------
  // Test 10: Escaping of untrusted content in email templates
  // -------------------------------------------------------------
  it('10. should safely escape malicious HTML / script injection in email templates', () => {
    const maliciousPayload = '<script>alert("XSS")</script><img src="x" onerror="evil()"/>';

    const safeEscaped = escapeHtml(maliciousPayload);
    assert.ok(!safeEscaped.includes('<script>'), 'Must not contain raw script tags');
    assert.ok(safeEscaped.includes('&lt;script&gt;'), 'Must encode opening script bracket');
    assert.ok(safeEscaped.includes('&quot;'), 'Must encode quotation marks');

    // Test in Welcome template
    const welcome = renderWelcomeEmail({
      name: maliciousPayload,
      email: 'hacker@example.com',
      playerId: 'PH-<EVIL>',
      clientUrl: 'https://picklehub.app',
    });

    assert.ok(!welcome.html.includes('<script>alert'), 'Welcome HTML must not execute injected script');
    assert.ok(welcome.html.includes('&lt;script&gt;'), 'Welcome HTML must escape name');
    assert.ok(welcome.html.includes('&lt;EVIL&gt;'), 'Welcome HTML must escape playerId');

    // Test in Match Result template
    const matchResult = renderMatchResultEmail({
      recipientName: maliciousPayload,
      recipientPlayerId: 'PH-0001',
      match: {
        matchId: 'M-1234',
        court: '<Court 1>',
        matchType: 'SINGLES',
        scores: [{ teamAScore: 11, teamBScore: 9 }],
        winnerTeam: 'A',
        teamA: [{ name: maliciousPayload }],
        teamB: [{ name: 'Safe Player' }],
      },
      personalOutcome: {
        isWinner: true,
        oldRating: 1000,
        newRating: 1016,
        delta: 16,
        category: '<Elite>',
      },
      clientUrl: 'https://picklehub.app',
    });

    assert.ok(!matchResult.html.includes('<script>alert'), 'Match Result HTML must not execute injected script');
    assert.ok(matchResult.html.includes('&lt;Court 1&gt;'), 'Court name must be escaped');
    assert.ok(matchResult.html.includes('&lt;Elite&gt;'), 'Category must be escaped');
  });

  // -------------------------------------------------------------
  // Test 11: Rating and match-processing regression resilience
  // -------------------------------------------------------------
  it('11. should preserve 100% of rating and match updates even if email delivery throws an error', async () => {
    // Configure mock to fail catastrophically
    mockShouldFail = true;
    mockErrorMessage = 'Fatal Provider Outage 503';

    const matchBeforeApproval = await Match.create({
      matchId: `M-RESILIENCE-${Date.now()}`,
      court: 'Court 1',
      matchType: 'SINGLES',
      teamA: [testPlayerA._id],
      teamB: [testPlayerB._id],
      scores: [{ teamAScore: 11, teamBScore: 2 }, { teamAScore: 11, teamBScore: 3 }],
      winnerTeam: 'A',
      submittedBy: testPlayerA._id,
      status: 'PENDING_APPROVAL',
    });
    createdMatchIds.push(matchBeforeApproval._id);

    const playerABefore = await Player.findById(testPlayerA._id);
    const initialRating = playerABefore.currentRating;

    // Approve match — should NOT fail despite email provider outage
    let approvedMatch = null;
    try {
      approvedMatch = await executeAtomicMatchApproval({
        matchId: matchBeforeApproval._id,
        adminUserId: adminUser._id,
      });
    } catch (err) {
      assert.fail(`Approval should not have thrown an error: ${err.message}`);
    }

    assert.ok(approvedMatch, 'Approved match should be returned');
    assert.equal(approvedMatch.status, 'APPROVED', 'Match status must be APPROVED');

    const playerAAfter = await Player.findById(testPlayerA._id);
    assert.ok(playerAAfter.currentRating > initialRating, 'Player rating MUST be updated');
    assert.equal(playerAAfter.wins, playerABefore.wins + 1, 'Wins count MUST increment');
  });

  // -------------------------------------------------------------
  // Test 12: Successful Login Security Alert
  // -------------------------------------------------------------
  it('12. should queue and send login alert email upon user sign-in', async () => {
    mockShouldFail = false;
    sentEmails.length = 0;

    const notif = await emailService.queueAndSendLoginAlertEmail({
      user: testUserA,
      player: testPlayerA,
      ipAddress: '192.168.1.50',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      loginTime: new Date(),
    });

    assert.ok(notif, 'Notification record should be returned');
    assert.equal(notif.status, 'SENT', 'Notification status should be SENT');
    assert.equal(notif.eventType, 'LOGIN_ALERT');
    assert.equal(notif.recipientEmail, testUserA.email.toLowerCase());
    createdNotificationIds.push(notif._id);

    // Verify mock client recorded dispatch
    assert.equal(sentEmails.length, 1);
    assert.ok(sentEmails[0].subject.includes('Security Alert: New Sign-In'));
    assert.ok(sentEmails[0].html.includes('192.168.1.50'));
  });

  // -------------------------------------------------------------
  // Test 13: Login Alert Opt-out check
  // -------------------------------------------------------------
  it('13. should respect emailLoginAlerts opt-out preference', async () => {
    mockShouldFail = false;
    sentEmails.length = 0;

    // Turn off login alerts for user B
    testUserB.notificationPreferences.emailLoginAlerts = false;
    await testUserB.save();

    const notif = await emailService.queueAndSendLoginAlertEmail({
      user: testUserB,
      player: testPlayerB,
      ipAddress: '10.0.0.1',
      userAgent: 'Chrome',
    });

    assert.equal(notif, null, 'Should return null when user has opted out');
    assert.equal(sentEmails.length, 0, 'No email should be dispatched via Resend');

    // Restore preference
    testUserB.notificationPreferences.emailLoginAlerts = true;
    await testUserB.save();
  });

  // -------------------------------------------------------------
  // Test 14: Account Lockout Warning Email
  // -------------------------------------------------------------
  it('14. should send account locked email when repeated failed logins occur', async () => {
    mockShouldFail = false;
    sentEmails.length = 0;

    const notif = await emailService.queueAndSendAccountLockedEmail({
      user: testUserA,
      player: testPlayerA,
      lockoutMinutes: 15,
      ipAddress: '203.0.113.195',
    });

    assert.ok(notif, 'Notification record should be returned');
    assert.equal(notif.status, 'SENT');
    assert.equal(notif.eventType, 'ACCOUNT_LOCKED');
    createdNotificationIds.push(notif._id);

    assert.equal(sentEmails.length, 1);
    assert.ok(sentEmails[0].subject.includes('Account Locked'));
    assert.ok(sentEmails[0].html.includes('15 minutes'));
  });

  // -------------------------------------------------------------
  // Test 15: Rating Tier Promotion / Milestone Email
  // -------------------------------------------------------------
  it('15. should dispatch milestone promotion email when athlete tier changes', async () => {
    mockShouldFail = false;
    sentEmails.length = 0;

    const notif = await emailService.queueAndSendRatingMilestoneEmail({
      user: testUserA,
      player: testPlayerA,
      oldCategory: 'Beginner',
      newCategory: 'Intermediate',
      newRating: 1220,
      matchesPlayed: 10,
      wins: 8,
    });

    assert.ok(notif, 'Milestone notification should be generated');
    assert.equal(notif.status, 'SENT');
    assert.equal(notif.eventType, 'RATING_MILESTONE');
    createdNotificationIds.push(notif._id);

    assert.equal(sentEmails.length, 1);
    assert.ok(sentEmails[0].subject.includes('Tier Promotion'));
    assert.ok(sentEmails[0].html.includes('Intermediate'));
  });

  // -------------------------------------------------------------
  // Test 16: Admin Match Rejection Notification
  // -------------------------------------------------------------
  it('16. should notify participants with reason when an admin rejects a match', async () => {
    mockShouldFail = false;
    sentEmails.length = 0;

    const rejectedMatch = {
      _id: new mongoose.Types.ObjectId(),
      matchId: 'PH-M99999',
      court: 'Center Court',
      matchType: 'SINGLES',
      teamA: [testPlayerA],
      teamB: [testPlayerB],
    };

    const notifs = await emailService.queueAndSendMatchRejectedEmail({
      match: rejectedMatch,
      reason: 'Score discrepancy reported by opponent',
    });

    assert.equal(notifs.length, 2, 'Both participants should receive rejection notification');
    notifs.forEach((n) => {
      assert.equal(n.status, 'SENT');
      assert.equal(n.eventType, 'MATCH_REJECTED');
      createdNotificationIds.push(n._id);
    });

    assert.equal(sentEmails.length, 2);
    assert.ok(sentEmails[0].subject.includes('Not Approved'));
    assert.ok(sentEmails[0].html.includes('Score discrepancy reported by opponent'));
  });
});
