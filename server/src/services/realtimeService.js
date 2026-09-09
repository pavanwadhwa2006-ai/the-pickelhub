/**
 * Real-Time Broadcast Service — The PickleHub
 *
 * Provides real-time WebSocket push notifications to connected clients
 * via Pusher Channels. Used to sync data across multiple devices logged
 * into the same account (e.g., phone + laptop).
 *
 * Channel Strategy:
 * - `picklehub-global`        — leaderboard updates, tournament changes (all clients)
 * - `private-user-{userId}`   — profile changes, personal match updates (per-user)
 * - `picklehub-admin`         — new pending matches, admin queue updates (admin clients)
 *
 * Gracefully no-ops if Pusher credentials are not configured (backward compatible).
 *
 * @module services/realtimeService
 */

const Pusher = require('pusher');

let pusher = null;

/**
 * Initialize the Pusher server instance.
 * Called lazily on first broadcast to avoid startup overhead if unused.
 */
const getPusher = () => {
  if (pusher) return pusher;

  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.PUSHER_KEY;
  const secret = process.env.PUSHER_SECRET;
  const cluster = process.env.PUSHER_CLUSTER;

  if (!appId || !key || !secret || !cluster) {
    // Pusher not configured — real-time features disabled gracefully
    return null;
  }

  pusher = new Pusher({
    appId,
    key,
    secret,
    cluster,
    useTLS: true,
  });

  return pusher;
};

/**
 * Broadcast an event to a Pusher channel.
 * Silently no-ops if Pusher is not configured.
 *
 * @param {string} channel - Channel name (e.g., 'picklehub-global')
 * @param {string} event   - Event name (e.g., 'match-approved')
 * @param {object} data    - Payload to send to subscribers
 */
const broadcast = (channel, event, data = {}) => {
  const instance = getPusher();
  if (!instance) return;

  instance.trigger(channel, event, {
    ...data,
    _timestamp: Date.now(),
  }).catch((err) => {
    console.warn(`⚠️ [Realtime] Failed to broadcast ${event} on ${channel}:`, err.message);
  });
};

/**
 * Authenticate a user for a private Pusher channel.
 * Required by Pusher for `private-*` channel subscriptions.
 *
 * @param {string} socketId  - Pusher socket ID from client
 * @param {string} channel   - Channel name being subscribed to
 * @returns {object|null}    - Auth response or null if Pusher not configured
 */
const authenticateChannel = (socketId, channel) => {
  const instance = getPusher();
  if (!instance) return null;

  return instance.authorizeChannel(socketId, channel);
};

// Pre-defined channel names for consistency
const CHANNELS = {
  GLOBAL: 'picklehub-global',
  ADMIN: 'picklehub-admin',
  userChannel: (userId) => `private-user-${userId}`,
};

// Pre-defined event names for consistency
const EVENTS = {
  MATCH_SUBMITTED: 'match-submitted',
  MATCH_APPROVED: 'match-approved',
  MATCH_REJECTED: 'match-rejected',
  RATING_UPDATED: 'rating-updated',
  TOURNAMENT_UPDATED: 'tournament-updated',
  PROFILE_UPDATED: 'profile-updated',
  LEADERBOARD_UPDATED: 'leaderboard-updated',
  BOOKING_CREATED: 'booking-created',
  BOOKING_CANCELLED: 'booking-cancelled',
};

module.exports = {
  broadcast,
  authenticateChannel,
  CHANNELS,
  EVENTS,
  getPusher,
};
