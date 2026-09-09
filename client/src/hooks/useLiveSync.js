/**
 * useLiveSync Hook — The PickleHub
 *
 * Subscribes a component to real-time WebSocket events via Pusher Channels.
 * When the specified event triggers, executes the provided callback (e.g. data refetch).
 *
 * Dual-Resilience Architecture:
 * 1. Instant WebSocket push (< 100ms) when other devices make changes.
 * 2. Smart window focus refetch: automatically triggers callback when the tab/app
 *    regains focus (e.g. waking up a phone or returning to a browser tab).
 *
 * Automatically handles channel subscription lifecycle, unbinding, and unmounting.
 *
 * @param {string|null} channelName - Pusher channel name (e.g., 'picklehub-global')
 * @param {string|Array<string>} eventNames - Event name(s) to listen for
 * @param {Function} onEvent - Callback to execute when event is received
 * @param {object} [options] - Optional settings
 * @param {boolean} [options.syncOnFocus=true] - Trigger on window focus
 * @param {boolean} [options.enabled=true] - Whether subscription is active
 */

import { useEffect, useRef } from 'react';
import { getPusherClient } from '../services/realtime';

export const useLiveSync = (channelName, eventNames, onEvent, options = {}) => {
  const { syncOnFocus = true, enabled = true } = options;
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  // 1. Pusher WebSocket subscription
  useEffect(() => {
    if (!enabled || !channelName) return;

    const pusher = getPusherClient();
    if (!pusher) return;

    const channel = pusher.subscribe(channelName);
    const events = Array.isArray(eventNames) ? eventNames : [eventNames];

    const handler = (data) => {
      if (typeof onEventRef.current === 'function') {
        onEventRef.current(data);
      }
    };

    events.forEach((evt) => {
      channel.bind(evt, handler);
    });

    return () => {
      events.forEach((evt) => {
        channel.unbind(evt, handler);
      });
      // Do not unsubscribe completely if other components share the channel,
      // Pusher manages subscriber reference counts internally if left subscribed,
      // but unbinding the specific callback ensures no memory leaks.
    };
  }, [channelName, JSON.stringify(eventNames), enabled]);

  // 2. Smart Focus Sync (when tab gains focus or device wakes up)
  useEffect(() => {
    if (!enabled || !syncOnFocus) return;

    let lastSync = Date.now();

    const handleFocus = () => {
      // Throttle focus sync to once every 4 seconds to avoid spamming
      if (Date.now() - lastSync > 4000) {
        lastSync = Date.now();
        if (typeof onEventRef.current === 'function') {
          onEventRef.current({ source: 'focus' });
        }
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        handleFocus();
      }
    });

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [syncOnFocus, enabled]);
};

export default useLiveSync;
