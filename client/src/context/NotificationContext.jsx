/**
 * Notification Context & Provider — The PickleHub
 *
 * Provides reactive in-app notification management, floating live toasts,
 * real-time event subscriptions via Pusher, and Web Notification API integration.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from './useAuth';
import useLiveSync from '../hooks/useLiveSync';
import { REALTIME_CHANNELS, REALTIME_EVENTS } from '../services/realtime';
import NotificationContext from './NotificationContextDef';

const STORAGE_KEY = 'picklehub_notifications';
const MAX_NOTIFICATIONS = 30;

export const NotificationProvider = ({ children }) => {
  const { user, player, isAdmin, isAdminMode } = useAuth();

  // Stored persistent notifications (auto-purges corrupted focus-loop artifacts)
  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((n) => {
        if (!n || !n.message) return false;
        // Purge test notifications and synthetic agent artifacts
        const testPattern = /test|refresh_test|testadmin|reg_refresh|picklehub\.test/i;
        if (testPattern.test(n.title || '') || testPattern.test(n.message || '')) {
          return false;
        }
        // Purge phantom focus-loop notifications (e.g. empty matchId or fallback tournament notices)
        if (n.message.includes('was ratified and rating history deltas have been recorded') && (!n.message.includes('PH-M') && !n.message.includes('M-'))) {
          return false;
        }
        if (n.message === 'Tournament schedule and bracket standings have advanced.') {
          return false;
        }
        return true;
      });
    } catch {
      return [];
    }
  });

  // Ephemeral floating toast queue (auto-dismissing)
  const [toasts, setToasts] = useState([]);

  // Native Web Notification API permission state
  const [pushPermission, setPushPermission] = useState(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });

  // Track handled event IDs to deduplicate across reconnects
  const processedNotifsRef = useRef(new Set());

  // Sync notifications to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
    } catch {
      // Storage full or unavailable
    }
  }, [notifications]);

  // Remove toast by id
  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Dispatch a notification (adds to history, spawns toast, triggers native push)
  const addNotification = useCallback(
    ({ title, message, type = 'INFO', link = null, icon = null }) => {
      const id = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const newNotif = {
        id,
        title,
        message,
        type, // 'MATCH' | 'TOURNAMENT' | 'ADMIN' | 'CHALLENGE' | 'SYSTEM' | 'INFO'
        link,
        icon,
        read: false,
        createdAt: new Date().toISOString(),
      };

      // 1. Add to persistent notification drawer history
      setNotifications((prev) => [newNotif, ...prev.slice(0, MAX_NOTIFICATIONS - 1)]);

      // 2. Add to live floating toast queue
      setToasts((prev) => [...prev, newNotif]);

      // 3. Auto-dismiss toast after 5 seconds
      setTimeout(() => {
        removeToast(id);
      }, 5500);

      // 4. Trigger native OS / device push notification if permission granted
      if (
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted'
      ) {
        try {
          const nativeNotif = new Notification(title, {
            body: message,
            icon: '/vite.svg',
            badge: '/vite.svg',
          });

          if (link) {
            nativeNotif.onclick = () => {
              window.focus();
              window.location.href = link;
            };
          }
        } catch {
          // Native notification creation prevented by browser policy
        }
      }

      // 5. Gentle device vibration on supported mobile devices
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate([40, 60, 40]);
        } catch {
          // Ignore vibration errors
        }
      }
    },
    [removeToast]
  );

  // Request native browser push notification permission
  const requestPushPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }

    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);
      if (permission === 'granted') {
        addNotification({
          title: '🔔 Push Notifications Enabled',
          message: 'You will now receive instant match approvals and courtside challenge alerts.',
          type: 'SYSTEM',
        });
      }
      return permission;
    } catch {
      return 'denied';
    }
  }, [addNotification]);

  // Mark single notification as read
  const markAsRead = useCallback((id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Unread notification count
  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  // --------------------------------------------------------------------------
  // Real-Time Event Handlers (Pusher WebSockets)
  // --------------------------------------------------------------------------

  // 1. Real-time MATCH_APPROVED handler (only notify athletes who actually played the match)
  useLiveSync(
    REALTIME_CHANNELS.GLOBAL,
    [REALTIME_EVENTS.MATCH_APPROVED],
    (data) => {
      // Strictly ignore window-focus triggers and empty payloads
      if (!data || data.source === 'focus' || !data.matchId) return;

      const notifKey = `approved_${data.matchId}`;
      if (processedNotifsRef.current.has(notifKey)) return;
      processedNotifsRef.current.add(notifKey);

      // Check if the current authenticated athlete participated in this match
      const currentId = player?.playerId?.toUpperCase();
      const match = data?.match;

      const isParticipant =
        currentId &&
        (match?.teamA?.some((p) => p.playerId?.toUpperCase() === currentId) ||
          match?.teamB?.some((p) => p.playerId?.toUpperCase() === currentId));

      if (isParticipant) {
        addNotification({
          title: '🎾 Match Result Approved!',
          message: `Your match on ${match?.court || 'Court 1'} has been officially verified by club governance. Ratings have updated!`,
          type: 'MATCH',
          link: '/dashboard',
          icon: '🏓',
        });
      }
    },
    { enabled: Boolean(user), syncOnFocus: false }
  );

  // 2. Real-time MATCH_SUBMITTED handler (only notify admins on genuine match submissions)
  useLiveSync(
    isAdmin ? REALTIME_CHANNELS.ADMIN : null,
    [REALTIME_EVENTS.MATCH_SUBMITTED],
    (data) => {
      // Strictly ignore window-focus triggers and empty payloads
      if (!data || data.source === 'focus' || !data.matchId) return;

      const notifKey = `submitted_${data.matchId}`;
      if (processedNotifsRef.current.has(notifKey)) return;
      processedNotifsRef.current.add(notifKey);

      if (isAdminMode) {
        addNotification({
          title: '📋 New Match Pending Approval',
          message: `Match ${data.matchId} on ${data?.court || 'Court 1'} has been submitted and is awaiting administrative verification.`,
          type: 'ADMIN',
          link: '/admin',
          icon: '⚖️',
        });
      }
    },
    { enabled: Boolean(isAdmin && isAdminMode), syncOnFocus: false }
  );

  // 3. Real-time TOURNAMENT_UPDATED handler (only notify on real tournament events)
  useLiveSync(
    REALTIME_CHANNELS.GLOBAL,
    [REALTIME_EVENTS.TOURNAMENT_UPDATED],
    (data) => {
      // Strictly ignore window-focus triggers and empty payloads
      if (!data || data.source === 'focus' || (!data.tournamentId && !data.title)) return;

      const notifKey = `tournament_${data.tournamentId || data.title}_${data._timestamp || ''}`;
      if (processedNotifsRef.current.has(notifKey)) return;
      processedNotifsRef.current.add(notifKey);

      addNotification({
        title: '🏆 Tournament Notice',
        message: data.title
          ? `Updates posted for tournament: ${data.title}.`
          : 'Tournament schedule or bracket standings have been updated.',
        type: 'TOURNAMENT',
        link: '/tournaments',
        icon: '🏅',
      });
    },
    { enabled: Boolean(user), syncOnFocus: false }
  );

  const value = {
    notifications,
    toasts,
    unreadCount,
    pushPermission,
    addNotification,
    removeToast,
    markAsRead,
    markAllAsRead,
    clearAll,
    requestPushPermission,
  };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export default NotificationProvider;
