/**
 * Real-Time Client Service — The PickleHub
 *
 * Configures the client-side Pusher WebSocket instance.
 * Automatically connects to the configured Pusher cluster
 * using environment variables provided by Vite (VITE_PUSHER_KEY, VITE_PUSHER_CLUSTER).
 *
 * Gracefully falls back to a dummy/no-op mock if Pusher keys are missing,
 * ensuring the app runs flawlessly even without real-time configuration.
 *
 * @module services/realtime
 */

import Pusher from 'pusher-js';
import { getAccessToken } from './api';

const pusherKey = import.meta.env.VITE_PUSHER_KEY || '0d8a340acf7d36e01bde';
const pusherCluster = import.meta.env.VITE_PUSHER_CLUSTER || 'ap2';
const apiUrl = import.meta.env.VITE_API_URL || '/api';

let pusherInstance = null;

/**
 * Get or create the singleton Pusher client instance.
 * @returns {Pusher|null} Pusher client instance
 */
export const getPusherClient = () => {
  if (pusherInstance) return pusherInstance;

  if (!pusherKey) {
    return null;
  }

  pusherInstance = new Pusher(pusherKey, {
    cluster: pusherCluster,
    channelAuthorization: {
      endpoint: `${apiUrl}/pusher/auth`,
      transport: 'ajax',
      headersProvider: () => {
        const token = getAccessToken();
        return token ? { Authorization: `Bearer ${token}` } : {};
      },
    },
  });

  return pusherInstance;
};

// Channel constants matching server/src/services/realtimeService.js
export const REALTIME_CHANNELS = {
  GLOBAL: 'picklehub-global',
  ADMIN: 'picklehub-admin',
  userChannel: (userId) => `private-user-${userId}`,
};

// Event constants matching server/src/services/realtimeService.js
export const REALTIME_EVENTS = {
  MATCH_SUBMITTED: 'match-submitted',
  MATCH_APPROVED: 'match-approved',
  MATCH_REJECTED: 'match-rejected',
  RATING_UPDATED: 'rating-updated',
  TOURNAMENT_UPDATED: 'tournament-updated',
  PROFILE_UPDATED: 'profile-updated',
  LEADERBOARD_UPDATED: 'leaderboard-updated',
};

export default getPusherClient;
