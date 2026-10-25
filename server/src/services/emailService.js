/**
 * Email Service — The PickleHub Production Transactional Email Dispatcher
 *
 * Implements reliable, idempotent email notifications via Resend:
 * 1. Durable Outbox: Every notification is persisted in MongoDB before or during dispatch.
 * 2. Idempotency Guard: Unique composite keys guarantee no duplicate emails per business event.
 * 3. Non-blocking Execution: Email transport errors NEVER abort or roll back business transactions.
 * 4. Bounded Retries: Exponential backoff scheduling for temporary provider outages.
 * 5. Environment Resilient: Simulates or skips dispatch safely when credentials are unconfigured or in tests.
 *
 * @module services/emailService
 */

const { Resend } = require('resend');
const { RESEND_API_KEY, EMAIL_FROM, CLIENT_URL, NODE_ENV } = require('../config/env');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Player = require('../models/Player');
const {
  renderWelcomeEmail,
  renderMatchResultEmail,
  renderLoginAlertEmail,
  renderAccountLockedEmail,
  renderRatingMilestoneEmail,
  renderMatchRejectedEmail,
} = require('./emailTemplates');

// Initialize Resend Client if API key is provided
let resendClient = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

/**
 * Injects a mock Resend client for automated unit and integration tests.
 * @param {object|null} mockClient - Mock client implementing emails.send
 */
const setResendClient = (mockClient) => {
  resendClient = mockClient;
};

/**
 * Checks whether the email provider is configured with credentials.
 * @returns {boolean} True if Resend client is active
 */
const isConfigured = () => {
  return !!resendClient;
};

/**
 * Calculates exponential backoff delay for retries.
 * 1st failure: 2 minutes
 * 2nd failure: 10 minutes
 * 3rd failure: Terminal failure (FAILED)
 *
 * @param {number} attemptNumber
 * @returns {Date} Scheduled retry date
 */
const calculateNextRetry = (attemptNumber) => {
  const backoffDelaysMs = [
    2 * 60 * 1000,  // 2m
    10 * 60 * 1000, // 10m
  ];
  const delay = backoffDelaysMs[attemptNumber - 1] || 15 * 60 * 1000;
  return new Date(Date.now() + delay);
};

/**
 * Sends a transactional email through the persistent outbox workflow.
 *
 * @param {object} params
 * @param {string} params.to - Recipient email address
 * @param {string} params.subject - Email subject line
 * @param {string} params.html - Rendered HTML content
 * @param {string} params.text - Plain-text fallback
 * @param {string} params.idempotencyKey - Stable unique key per logical event
 * @param {mongoose.Types.ObjectId} params.recipientUser - Recipient User ObjectId
 * @param {mongoose.Types.ObjectId} [params.recipientPlayer] - Recipient Player ObjectId
 * @param {string} params.eventType - 'WELCOME' | 'MATCH_RESULT' | 'SYSTEM'
 * @param {string} [params.resourceType='None'] - 'User' | 'Match' | 'None'
 * @param {string} [params.resourceId=null] - Identifier of the associated resource
 * @param {object} [params.metadata={}] - Structured event metadata
 * @returns {Promise<Notification>} Persisted Notification document
 */
const sendRawEmail = async ({
  to,
  subject,
  html,
  text,
  idempotencyKey,
  recipientUser,
  recipientPlayer = null,
  eventType,
  resourceType = 'None',
  resourceId = null,
  metadata = {},
}) => {
  if (!to || !subject || !idempotencyKey || !recipientUser) {
    const error = new Error('Missing required email delivery parameters (to, subject, idempotencyKey, recipientUser).');
    error.statusCode = 400;
    throw error;
  }

  const normalizedEmail = to.toLowerCase().trim();

  // 1. Idempotency Check & Outbox Persistence
  let notification;
  try {
    notification = await Notification.findOne({ idempotencyKey });
    if (notification) {
      // If already sent or delivered, return without resending (idempotency guard)
      if (['SENT', 'DELIVERED', 'CANCELLED'].includes(notification.status)) {
        return notification;
      }
    } else {
      notification = await Notification.create({
        recipientUser,
        recipientPlayer,
        recipientEmail: normalizedEmail,
        eventType,
        resourceType,
        resourceId: resourceId ? String(resourceId) : null,
        idempotencyKey,
        subject,
        status: 'PENDING',
        provider: 'resend',
        metadata,
      });
    }
  } catch (dbErr) {
    // If concurrent insert race hit unique index, fetch the winner
    if (dbErr.code === 11000) {
      notification = await Notification.findOne({ idempotencyKey });
      if (notification && ['SENT', 'DELIVERED', 'CANCELLED'].includes(notification.status)) {
        return notification;
      }
    } else {
      console.error('Failed to persist notification outbox record:', dbErr.message);
      throw dbErr;
    }
  }

  // 2. Check User Opt-Out / Preferences
  if (eventType === 'MATCH_RESULT') {
    try {
      const user = await User.findById(recipientUser).select('notificationPreferences');
      if (user?.notificationPreferences?.emailMatchResults === false) {
        notification.status = 'CANCELLED';
        notification.metadata = {
          ...notification.metadata,
          cancellationReason: 'User opted out of match result email notifications',
        };
        await notification.save();
        return notification;
      }
    } catch (prefErr) {
      console.warn('Could not verify user notification preferences, proceeding:', prefErr.message);
    }
  }

  if (eventType === 'LOGIN_ALERT') {
    try {
      const user = await User.findById(recipientUser).select('notificationPreferences');
      if (user?.notificationPreferences?.emailLoginAlerts === false) {
        notification.status = 'CANCELLED';
        notification.metadata = {
          ...notification.metadata,
          cancellationReason: 'User opted out of login alert email notifications',
        };
        await notification.save();
        return notification;
      }
    } catch (prefErr) {
      console.warn('Could not verify user login alert preferences, proceeding:', prefErr.message);
    }
  }

  // 3. Provider Dispatch
  notification.attempts += 1;
  notification.lastAttemptAt = new Date();

  // Mode A: Test or Unconfigured Environment (Mock/Dev fallback)
  if (!resendClient) {
    if (NODE_ENV !== 'production') {
      // Simulate successful dispatch in test and local environments when no key is set
      const mockMessageId = `mock_msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      notification.status = 'SENT';
      notification.providerMessageId = mockMessageId;
      notification.sentAt = new Date();
      notification.error = { code: null, message: null, timestamp: null };
      await notification.save();
      return notification;
    } else {
      // Production without RESEND_API_KEY
      notification.status = 'FAILED';
      notification.error = {
        code: 'MISSING_API_KEY',
        message: 'RESEND_API_KEY environment variable is not configured.',
        timestamp: new Date(),
      };
      notification.failedAt = new Date();
      await notification.save();
      return notification;
    }
  }

  // Mode B: Active Resend Provider Dispatch
  try {
    const fromAddress = EMAIL_FROM || 'The PickleHub <onboarding@resend.dev>';

    let targetEmail = normalizedEmail;
    let finalSubject = subject;
    let finalHtml = html;
    let finalText = text;
    let isSandboxedFallback = false;

    let res = await resendClient.emails.send({
      from: fromAddress,
      to: [targetEmail],
      subject: finalSubject,
      html: finalHtml,
      text: finalText,
      headers: {
        'X-PickleHub-Idempotency': idempotencyKey,
      },
    });

    if (res?.error) {
      // Check if Resend sandbox restriction (HTTP 403 on onboarding@resend.dev)
      const errStr = res.error.message || '';
      const sandboxMatch = errStr.match(/to your own email address \(([^)]+)\)/i);
      const devFallbackEmail = process.env.RESEND_DEV_FORWARD_TO || (sandboxMatch ? sandboxMatch[1] : null);

      if (devFallbackEmail && targetEmail !== devFallbackEmail.toLowerCase().trim()) {
        console.warn(`[Resend Sandbox Notice]: Free testing account (${fromAddress}) restricted to registered email (${devFallbackEmail}). Forwarding email intended for ${targetEmail} to developer inbox... (To send directly to all users, verify a domain in resend.com/domains)`);
        isSandboxedFallback = true;
        targetEmail = devFallbackEmail.toLowerCase().trim();
        finalSubject = `[Sandbox Test for ${normalizedEmail}] ${subject}`;
        finalHtml = `<div style="background:#2d2410;color:#fcd34d;padding:12px 16px;margin-bottom:16px;border:1px solid #78350f;border-radius:8px;font-family:sans-serif;font-size:12px;line-height:1.5;"><strong>⚠️ RESEND SANDBOX DEV NOTICE:</strong> This email was generated for <strong>${normalizedEmail}</strong> and forwarded to your verified developer address. To send directly to each user's personal email, verify a custom domain at <a href="https://resend.com/domains" style="color:#60a5fa;">resend.com/domains</a>.</div>` + html;
        finalText = `[DEV SANDBOX: Generated for ${normalizedEmail}]\n\n` + text;

        res = await resendClient.emails.send({
          from: fromAddress,
          to: [targetEmail],
          subject: finalSubject,
          html: finalHtml,
          text: finalText,
          headers: {
            'X-PickleHub-Idempotency': `${idempotencyKey}_dev`,
          },
        });
      }

      if (res?.error) {
        throw res.error;
      }
    }

    notification.status = 'SENT';
    notification.providerMessageId = res?.data?.id || `resend_${Date.now()}`;
    notification.sentAt = new Date();
    notification.error = { code: null, message: null, timestamp: null };
    if (isSandboxedFallback) {
      notification.metadata = {
        ...notification.metadata,
        sentViaSandboxRedirect: true,
        originalRecipient: normalizedEmail,
      };
    }
    await notification.save();
    return notification;
  } catch (sendErr) {
    const isTerminal = notification.attempts >= notification.maxAttempts;

    notification.status = isTerminal ? 'FAILED' : 'PENDING';
    notification.nextRetryAt = isTerminal ? null : calculateNextRetry(notification.attempts);
    notification.failedAt = isTerminal ? new Date() : null;
    notification.error = {
      code: sendErr.name || 'PROVIDER_ERROR',
      message: sendErr.message ? sendErr.message.slice(0, 300) : 'Unknown Resend error',
      timestamp: new Date(),
    };

    await notification.save();
    console.error(`Email dispatch error for ${normalizedEmail} (Attempt ${notification.attempts}/${notification.maxAttempts}):`, sendErr.message);
    return notification;
  }
};

/**
 * Queues and sends a Welcome email to a newly registered athlete.
 *
 * @param {object} params
 * @param {object} params.user - User document
 * @param {object} [params.player] - Player profile document
 * @returns {Promise<Notification|null>}
 */
const queueAndSendWelcomeEmail = async ({ user, player = null }) => {
  if (!user || !user.email) return null;

  try {
    const idempotencyKey = `welcome_${user._id.toString()}`;
    const playerName = player?.name || user.email.split('@')[0];
    const playerId = player?.playerId || null;

    const { subject, html, text } = renderWelcomeEmail({
      name: playerName,
      email: user.email,
      playerId,
      clientUrl: CLIENT_URL,
    });

    return await sendRawEmail({
      to: user.email,
      subject,
      html,
      text,
      idempotencyKey,
      recipientUser: user._id,
      recipientPlayer: player?._id || null,
      eventType: 'WELCOME',
      resourceType: 'User',
      resourceId: user._id.toString(),
      metadata: {
        playerId,
        role: user.role,
      },
    });
  } catch (err) {
    // Non-blocking: log error and never throw to caller
    console.error('Failed to process welcome email notification:', err.message);
    return null;
  }
};

/**
 * Queues and sends Official Match Result notifications to all participating players.
 *
 * Trigger Rule: Triggered ONLY after an official match has been approved and rating changes committed.
 *
 * @param {object} params
 * @param {object} params.match - Populated Match document with teamA, teamB, and ratingChanges
 * @returns {Promise<Array<Notification>>} List of created/dispatched notification documents
 */
const queueAndSendMatchResultEmails = async ({ match }) => {
  if (!match) return [];

  // Enforce rule: Never send official result emails for unapproved or non-existent matches
  if (match.status !== 'APPROVED') {
    return [];
  }

  const results = [];

  try {
    // Extract participating players across teamA and teamB
    const teamAPlayers = Array.isArray(match.teamA) ? match.teamA : [];
    const teamBPlayers = Array.isArray(match.teamB) ? match.teamB : [];
    const allParticipants = [...teamAPlayers, ...teamBPlayers];

    if (allParticipants.length === 0) {
      return [];
    }

    // Resolve player IDs and fetch user accounts for emails and preferences
    const playerIds = allParticipants.map((p) => p._id || p);
    const playerDocs = await Player.find({ _id: { $in: playerIds } }).populate('userId');

    const playerMap = new Map();
    playerDocs.forEach((p) => playerMap.set(p._id.toString(), p));

    // Map rating changes by playerId
    const ratingChangeMap = new Map();
    if (Array.isArray(match.ratingChanges)) {
      match.ratingChanges.forEach((rc) => {
        if (rc.playerId) {
          ratingChangeMap.set(rc.playerId.toString(), rc);
        }
      });
    }

    const isWinnerA = match.winnerTeam === 'A';
    const winningPlayerIds = new Set(
      (isWinnerA ? teamAPlayers : teamBPlayers).map((p) => (p._id || p).toString())
    );

    const matchIdStr = match.matchId || match._id.toString();

    // Dispatch a personalized result notification to each participant
    for (const participant of allParticipants) {
      const pIdStr = (participant._id || participant).toString();
      const playerDoc = playerMap.get(pIdStr);

      if (!playerDoc || !playerDoc.userId || !playerDoc.userId.email) {
        continue;
      }

      const userDoc = playerDoc.userId;
      const isWinner = winningPlayerIds.has(pIdStr);
      const ratingChange = ratingChangeMap.get(pIdStr);

      const oldRating = ratingChange ? ratingChange.oldRating : playerDoc.currentRating;
      const newRating = ratingChange ? ratingChange.newRating : playerDoc.currentRating;
      const delta = ratingChange ? ratingChange.delta : 0;

      const personalOutcome = {
        isWinner,
        oldRating,
        newRating,
        delta,
        category: playerDoc.category || 'Beginner',
        tournamentBonus: match.isTournament ? (match.tournamentBonus || 0) : 0,
      };

      const { subject, html, text } = renderMatchResultEmail({
        recipientName: playerDoc.name || userDoc.email.split('@')[0],
        recipientPlayerId: playerDoc.playerId,
        match,
        personalOutcome,
        clientUrl: CLIENT_URL,
      });

      // Stable idempotency key guarantees no duplicate email for this match & player
      const idempotencyKey = `match_result_${matchIdStr}_${pIdStr}`;

      const notif = await sendRawEmail({
        to: userDoc.email,
        subject,
        html,
        text,
        idempotencyKey,
        recipientUser: userDoc._id,
        recipientPlayer: playerDoc._id,
        eventType: 'MATCH_RESULT',
        resourceType: 'Match',
        resourceId: matchIdStr,
        metadata: {
          matchId: matchIdStr,
          matchType: match.matchType,
          court: match.court,
          isWinner,
          delta,
          newRating,
        },
      });

      if (notif) {
        results.push(notif);
      }
    }
  } catch (err) {
    console.error('Failed to queue match result notification emails:', err.message);
  }

  return results;
};

/**
 * Recovers and re-dispatches pending/failed outbox notifications.
 *
 * Compatible with serverless execution / cron trigger.
 *
 * @param {object} [options]
 * @param {number} [options.limit=10] - Maximum jobs to process per run
 * @returns {Promise<{ processed: number, succeeded: number, failed: number }>}
 */
const processOutboxRetries = async ({ limit = 10 } = {}) => {
  const pendingJobs = await Notification.find({
    status: { $in: ['PENDING', 'FAILED'] },
    attempts: { $lt: 3 },
    nextRetryAt: { $lte: new Date() },
  })
    .sort({ nextRetryAt: 1 })
    .limit(limit);

  let succeeded = 0;
  let failed = 0;

  for (const job of pendingJobs) {
    try {
      job.attempts += 1;
      job.lastAttemptAt = new Date();

      if (!resendClient) {
        job.status = 'SENT';
        job.providerMessageId = `mock_retry_${Date.now()}`;
        job.sentAt = new Date();
        await job.save();
        succeeded += 1;
        continue;
      }

      const { data, error } = await resendClient.emails.send({
        from: EMAIL_FROM || 'The PickleHub <onboarding@resend.dev>',
        to: [job.recipientEmail],
        subject: job.subject,
        html: `<p>${job.subject}</p>`,
        text: job.subject,
        headers: {
          'X-PickleHub-Idempotency': job.idempotencyKey,
        },
      });

      if (error) throw error;

      job.status = 'SENT';
      job.providerMessageId = data?.id || `resend_${Date.now()}`;
      job.sentAt = new Date();
      job.error = { code: null, message: null, timestamp: null };
      await job.save();
      succeeded += 1;
    } catch (err) {
      const isTerminal = job.attempts >= job.maxAttempts;
      job.status = isTerminal ? 'FAILED' : 'PENDING';
      job.nextRetryAt = isTerminal ? null : calculateNextRetry(job.attempts);
      job.error = {
        code: err.name || 'RETRY_ERROR',
        message: err.message ? err.message.slice(0, 300) : 'Retry failure',
        timestamp: new Date(),
      };
      await job.save();
      failed += 1;
    }
  }

  return {
    processed: pendingJobs.length,
    succeeded,
    failed,
  };
};

/**
 * Queues and sends a Login Alert security notification to an authenticated user.
 *
 * @param {object} params
 * @param {object} params.user - User document
 * @param {object} [params.player] - Linked Player document
 * @param {string} [params.ipAddress] - Client IP address
 * @param {string} [params.userAgent] - Browser User-Agent header
 * @param {Date} [params.loginTime] - Login timestamp
 * @returns {Promise<Notification|null>}
 */
const queueAndSendLoginAlertEmail = async ({
  user,
  player = null,
  ipAddress = 'Unknown',
  userAgent = 'Unknown',
  loginTime = new Date(),
}) => {
  if (!user || !user.email) return null;

  try {
    const userDoc = await User.findById(user._id).select('notificationPreferences email');
    if (userDoc?.notificationPreferences?.emailLoginAlerts === false) {
      return null;
    }

    const name = player?.name || user.email.split('@')[0];
    const { subject, html, text } = renderLoginAlertEmail({
      name,
      email: user.email,
      ipAddress,
      userAgent,
      loginTime,
      clientUrl: CLIENT_URL,
    });

    const idempotencyKey = `login_alert_${user._id.toString()}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    return await sendRawEmail({
      to: user.email,
      subject,
      html,
      text,
      idempotencyKey,
      recipientUser: user._id,
      recipientPlayer: player?._id || null,
      eventType: 'LOGIN_ALERT',
      resourceType: 'User',
      resourceId: user._id.toString(),
      metadata: {
        ipAddress,
        userAgent: userAgent ? userAgent.substring(0, 100) : 'Unknown',
        loginTime,
      },
    });
  } catch (err) {
    console.error('Failed to process login alert email notification:', err.message);
    return null;
  }
};

/**
 * Queues and sends an Account Locked warning notification when consecutive failed logins occur.
 *
 * @param {object} params
 * @param {object} params.user - User document
 * @param {object} [params.player] - Linked Player document
 * @param {number} [params.lockoutMinutes=15] - Duration of lockout in minutes
 * @param {string} [params.ipAddress] - IP of the last failed attempt
 * @returns {Promise<Notification|null>}
 */
const queueAndSendAccountLockedEmail = async ({
  user,
  player = null,
  lockoutMinutes = 15,
  ipAddress = 'Unknown',
}) => {
  if (!user || !user.email) return null;

  try {
    const name = player?.name || user.email.split('@')[0];
    const { subject, html, text } = renderAccountLockedEmail({
      name,
      email: user.email,
      lockoutMinutes,
      ipAddress,
      clientUrl: CLIENT_URL,
    });

    const idempotencyKey = `account_locked_${user._id.toString()}_${Date.now()}`;

    return await sendRawEmail({
      to: user.email,
      subject,
      html,
      text,
      idempotencyKey,
      recipientUser: user._id,
      recipientPlayer: player?._id || null,
      eventType: 'ACCOUNT_LOCKED',
      resourceType: 'User',
      resourceId: user._id.toString(),
      metadata: {
        lockoutMinutes,
        ipAddress,
      },
    });
  } catch (err) {
    console.error('Failed to process account locked email notification:', err.message);
    return null;
  }
};

/**
 * Queues and sends a Tier Promotion / Milestone email when an athlete reaches a new skill category.
 *
 * @param {object} params
 * @param {object} params.user - User document
 * @param {object} params.player - Player document
 * @param {string} params.oldCategory - Previous skill tier
 * @param {string} params.newCategory - Promoted skill tier
 * @param {number} params.newRating - New Elo rating
 * @param {number} params.matchesPlayed - Total matches played
 * @param {number} params.wins - Total wins
 * @returns {Promise<Notification|null>}
 */
const queueAndSendRatingMilestoneEmail = async ({
  user,
  player,
  oldCategory,
  newCategory,
  newRating,
  matchesPlayed,
  wins,
}) => {
  if (!user || !user.email || !player) return null;

  try {
    const { subject, html, text } = renderRatingMilestoneEmail({
      name: player.name || user.email.split('@')[0],
      playerId: player.playerId,
      oldCategory,
      newCategory,
      newRating,
      matchesPlayed,
      wins,
      clientUrl: CLIENT_URL,
    });

    const idempotencyKey = `milestone_${player._id.toString()}_${newCategory}`;

    return await sendRawEmail({
      to: user.email,
      subject,
      html,
      text,
      idempotencyKey,
      recipientUser: user._id,
      recipientPlayer: player._id,
      eventType: 'RATING_MILESTONE',
      resourceType: 'Player',
      resourceId: player.playerId || player._id.toString(),
      metadata: {
        oldCategory,
        newCategory,
        newRating,
        matchesPlayed,
        wins,
      },
    });
  } catch (err) {
    console.error('Failed to process rating milestone email notification:', err.message);
    return null;
  }
};

/**
 * Queues and sends a notification when an admin rejects a submitted match score.
 *
 * @param {object} params
 * @param {object} params.match - Populated Match document
 * @param {string} params.reason - Admin rejection reason
 * @returns {Promise<Array<Notification>>}
 */
const queueAndSendMatchRejectedEmail = async ({ match, reason }) => {
  if (!match) return [];
  const results = [];

  try {
    const teamAPlayers = Array.isArray(match.teamA) ? match.teamA : [];
    const teamBPlayers = Array.isArray(match.teamB) ? match.teamB : [];
    const allParticipants = [...teamAPlayers, ...teamBPlayers];

    if (allParticipants.length === 0) return [];

    const playerIds = allParticipants.map((p) => p._id || p);
    const playerDocs = await Player.find({ _id: { $in: playerIds } }).populate('userId');

    const matchIdStr = match.matchId || match._id.toString();

    for (const playerDoc of playerDocs) {
      if (!playerDoc?.userId?.email) continue;
      const userDoc = playerDoc.userId;

      const { subject, html, text } = renderMatchRejectedEmail({
        recipientName: playerDoc.name || userDoc.email.split('@')[0],
        recipientPlayerId: playerDoc.playerId,
        match,
        rejectionReason: reason,
        clientUrl: CLIENT_URL,
      });

      const idempotencyKey = `match_rejected_${matchIdStr}_${playerDoc._id.toString()}`;

      const notif = await sendRawEmail({
        to: userDoc.email,
        subject,
        html,
        text,
        idempotencyKey,
        recipientUser: userDoc._id,
        recipientPlayer: playerDoc._id,
        eventType: 'MATCH_REJECTED',
        resourceType: 'Match',
        resourceId: matchIdStr,
        metadata: {
          matchId: matchIdStr,
          court: match.court,
          matchType: match.matchType,
          rejectionReason: reason,
        },
      });

      if (notif) results.push(notif);
    }
  } catch (err) {
    console.error('Failed to process match rejection email notification:', err.message);
  }

  return results;
};

module.exports = {
  isConfigured,
  setResendClient,
  sendRawEmail,
  queueAndSendWelcomeEmail,
  queueAndSendMatchResultEmails,
  queueAndSendLoginAlertEmail,
  queueAndSendAccountLockedEmail,
  queueAndSendRatingMilestoneEmail,
  queueAndSendMatchRejectedEmail,
  processOutboxRetries,
};
