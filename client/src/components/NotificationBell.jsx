/**
 * NotificationBell Component — The PickleHub
 *
 * Navigation bar bell icon with live unread badge, popover alert drawer,
 * click-to-read interaction, native device push activator, and smooth mobile bottom-sheet.
 */

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../context/useNotifications';

const formatRelativeTime = (isoString) => {
  if (!isoString) return 'Just now';
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};

const TYPE_ICONS = {
  MATCH: '🏓',
  TOURNAMENT: '🏆',
  ADMIN: '👑',
  CHALLENGE: '⚡',
  SYSTEM: '🔔',
  INFO: 'ℹ️',
};

const getTypeBadgeStyle = (type) => {
  switch (type) {
    case 'MATCH':
      return 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border-emerald-500/30';
    case 'TOURNAMENT':
      return 'text-amber-700 dark:text-amber-300 bg-amber-500/10 border-amber-500/30';
    case 'ADMIN':
      return 'text-purple-700 dark:text-purple-300 bg-purple-500/10 border-purple-500/30';
    case 'CHALLENGE':
      return 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border-emerald-500/30';
    default:
      return 'text-[var(--color-accent-primary)] bg-[var(--color-accent-primary)]/10 border-[var(--color-accent-primary)]/30';
  }
};

const NotificationBell = () => {
  const {
    notifications,
    unreadCount,
    pushPermission,
    markAsRead,
    markAllAsRead,
    clearAll,
    requestPushPermission,
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'UNREAD'
  const navigate = useNavigate();

  const bellRef = useRef(null);
  const modalRef = useRef(null);

  // Responsive mobile detector
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 640 : false
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        bellRef.current &&
        !bellRef.current.contains(e.target) &&
        (!modalRef.current || !modalRef.current.contains(e.target))
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'UNREAD') return !n.read;
    return true;
  });

  const handleNotificationClick = (notif) => {
    markAsRead(notif.id);
    setIsOpen(false);
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const renderDropdown = () => (
    <>
      {/* Mobile Backdrop Overlay */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-xs z-[998] sm:hidden animate-fade-in"
        onClick={() => setIsOpen(false)}
      />

      {/* Drawer Container (Smooth Bottom Sheet on Mobile, Popover on Desktop) */}
      <div
        ref={modalRef}
        className="fixed inset-x-2 bottom-2 top-auto sm:inset-auto sm:absolute sm:right-0 sm:mt-3 sm:w-96 max-h-[85vh] sm:max-h-[580px] overflow-hidden bg-[var(--color-bg-card,#1a1508)] border-2 border-[var(--color-border-subtle,#3b3423)] text-[var(--color-text-primary,#ede1c9)] shadow-2xl z-[999] animate-fade-in flex flex-col rounded-3xl sm:rounded-2xl"
      >
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-[var(--color-border-subtle)] flex items-center justify-between bg-[var(--color-bg-base)]">
          <div className="flex items-center gap-2">
            <span className="text-base">🔔</span>
            <span className="font-['Playfair_Display'] font-bold text-sm sm:text-base text-[var(--color-text-primary)]">
              Activity & Alerts
            </span>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 bg-[var(--color-accent-primary)] text-white text-[10px] font-mono font-bold rounded-full">
                {unreadCount} new
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-accent-primary)] hover:underline cursor-pointer"
                title="Mark all notifications as read"
              >
                Mark Read
              </button>
            )}

            {isMobile && (
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] rounded-md transition-colors cursor-pointer"
                aria-label="Close notifications"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Native Browser Push Permission Banner (if not yet decided) */}
        {pushPermission === 'default' && (
          <div className="p-3 bg-[var(--color-bg-card-hover)] border-b border-[var(--color-border-subtle)] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm">⚡</span>
              <p className="text-[10px] text-[var(--color-text-secondary)] leading-tight truncate">
                Get instant phone alerts when matches are verified courtside.
              </p>
            </div>
            <button
              type="button"
              onClick={requestPushPermission}
              className="px-2.5 py-1 text-[9px] font-bold tracking-wider uppercase rounded-md bg-[var(--color-accent-primary)] text-white hover:brightness-110 shrink-0 cursor-pointer shadow-sm"
            >
              Enable
            </button>
          </div>
        )}

        {/* Filter Pills */}
        <div className="px-4 py-2 bg-[var(--color-bg-base)] border-b border-[var(--color-border-subtle)] flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilter('ALL')}
            className={`px-2.5 py-1 text-[10px] font-bold rounded-lg uppercase tracking-wider transition-all cursor-pointer ${
              filter === 'ALL'
                ? 'bg-[var(--color-accent-primary)] text-white'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('UNREAD')}
            className={`px-2.5 py-1 text-[10px] font-bold rounded-lg uppercase tracking-wider transition-all cursor-pointer ${
              filter === 'UNREAD'
                ? 'bg-[var(--color-accent-primary)] text-white'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            Unread ({unreadCount})
          </button>

          {notifications.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="ml-auto text-[9px] text-[var(--color-text-muted)] hover:text-[var(--color-accent-primary)] uppercase tracking-wider font-semibold cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Notifications Scrollable List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[var(--color-border-subtle)] p-2 space-y-1">
          {filteredNotifications.length === 0 ? (
            <div className="py-12 px-6 text-center flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] flex items-center justify-center text-xl mb-3">
                🏓
              </div>
              <h6 className="font-bold text-xs text-[var(--color-text-primary)] mb-1">
                No notifications
              </h6>
              <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed max-w-[220px]">
                {filter === 'UNREAD'
                  ? 'All caught up! No unread notifications.'
                  : 'Your live match results, tournament calls, and challenge alerts will appear here.'}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notif) => {
              const icon = notif.icon || TYPE_ICONS[notif.type] || '🔔';

              return (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3 rounded-xl transition-all cursor-pointer flex items-start gap-3 relative group ${
                    notif.read
                      ? 'hover:bg-[var(--color-bg-card-hover)] opacity-75'
                      : 'bg-[var(--color-accent-primary)]/8 hover:bg-[var(--color-accent-primary)]/15'
                  }`}
                >
                  {/* Unread indicator dot */}
                  {!notif.read && (
                    <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-[var(--color-accent-primary)] shadow-sm" />
                  )}

                  {/* Icon Avatar */}
                  <div className="w-8 h-8 rounded-xl bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] flex items-center justify-center text-sm shrink-0">
                    {icon}
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0 pr-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${getTypeBadgeStyle(notif.type)}`}>
                        {notif.type}
                      </span>
                      <span className="text-[10px] text-[var(--color-text-muted)] font-mono">
                        • {formatRelativeTime(notif.createdAt)}
                      </span>
                    </div>

                    <h6 className="font-bold text-xs text-[var(--color-text-primary)] leading-tight">
                      {notif.title}
                    </h6>
                    <p className="text-[11px] text-[var(--color-text-secondary)] mt-0.5 leading-relaxed font-normal">
                      {notif.message}
                    </p>

                    {notif.link && (
                      <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-[var(--color-accent-primary)] uppercase">
                        <span>Open Details</span>
                        <span>→</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );

  return (
    <div className="relative" ref={bellRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        id="nav-notification-bell-btn"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full border transition-all cursor-pointer group focus:outline-none hover:scale-105"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.2)',
          borderColor: unreadCount > 0 ? 'var(--color-accent-primary, #ff3b3f)' : 'var(--nav-border, #3b3423)',
          color: unreadCount > 0 ? 'var(--color-accent-primary, #ff3b3f)' : 'var(--nav-text, #ede1c9)',
        }}
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
        aria-expanded={isOpen}
      >
        <svg
          className="w-5 h-5 transition-transform group-hover:rotate-12"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Unread Counter Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 px-1.5 py-0.2 min-w-[18px] h-[18px] bg-[var(--color-accent-primary,#ff3b3f)] text-white text-[10px] font-mono font-bold rounded-full flex items-center justify-center shadow-[0_0_8px_rgba(255,59,63,0.9)] animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Render popover / modal */}
      {isOpen &&
        (isMobile && typeof document !== 'undefined'
          ? createPortal(renderDropdown(), document.body)
          : renderDropdown())}
    </div>
  );
};

export default NotificationBell;
