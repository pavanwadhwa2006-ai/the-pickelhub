/**
 * ToastContainer Component — The PickleHub
 *
 * Renders floating live activity notifications in the viewport with
 * choreographed enter/exit spring animations, sound/visual indicators,
 * and direct one-tap navigation.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../context/useNotifications';
import { useTheme } from '../context/useTheme';const TYPE_CONFIG = {
  MATCH: {
    label: 'Match Approved',
    defaultIcon: '🏓',
    light: {
      cardBg: '#FFFFFF',
      borderColor: '#059669',
      badgeBg: '#ECFDF5',
      badgeBorder: '#059669',
      typeColor: '#065F46',
      titleColor: '#064E3B',
      messageColor: '#1E293B',
      linkColor: '#059669',
      timeColor: '#536259',
    },
    dark: {
      cardBg: '#1C160B',
      borderColor: '#10B981',
      badgeBg: 'rgba(16, 185, 129, 0.2)',
      badgeBorder: '#10B981',
      typeColor: '#6EE7B7',
      titleColor: '#FFFFFF',
      messageColor: '#EDE1C9',
      linkColor: '#34D399',
      timeColor: '#9A8E7A',
    },
  },
  TOURNAMENT: {
    label: 'Tournament',
    defaultIcon: '🏆',
    light: {
      cardBg: '#FFFFFF',
      borderColor: '#B45309',
      badgeBg: '#FEF3C7',
      badgeBorder: '#B45309',
      typeColor: '#78350F',
      titleColor: '#0F2922',
      messageColor: '#2D3A33',
      linkColor: '#B45309',
      timeColor: '#536259',
    },
    dark: {
      cardBg: '#1C160B',
      borderColor: '#f59e0b',
      badgeBg: 'rgba(245, 158, 11, 0.2)',
      badgeBorder: '#f59e0b',
      typeColor: '#fde68a',
      titleColor: '#FFFFFF',
      messageColor: '#EDE1C9',
      linkColor: '#f59e0b',
      timeColor: '#9A8E7A',
    },
  },
  ADMIN: {
    label: 'Admin',
    defaultIcon: '👑',
    light: {
      cardBg: '#FFFFFF',
      borderColor: '#7E22CE',
      badgeBg: '#F3E8FF',
      badgeBorder: '#7E22CE',
      typeColor: '#581C87',
      titleColor: '#0F2922',
      messageColor: '#2D3A33',
      linkColor: '#7E22CE',
      timeColor: '#536259',
    },
    dark: {
      cardBg: '#1C160B',
      borderColor: '#a855f7',
      badgeBg: 'rgba(168, 85, 247, 0.2)',
      badgeBorder: '#a855f7',
      typeColor: '#e9d5ff',
      titleColor: '#FFFFFF',
      messageColor: '#EDE1C9',
      linkColor: '#c084fc',
      timeColor: '#9A8E7A',
    },
  },
  CHALLENGE: {
    label: 'Challenge',
    defaultIcon: '⚡',
    light: {
      cardBg: '#FFFFFF',
      borderColor: '#15803D',
      badgeBg: '#DCFCE7',
      badgeBorder: '#15803D',
      typeColor: '#14532D',
      titleColor: '#0F2922',
      messageColor: '#2D3A33',
      linkColor: '#15803D',
      timeColor: '#536259',
    },
    dark: {
      cardBg: '#1C160B',
      borderColor: '#10b981',
      badgeBg: 'rgba(168, 85, 247, 0.2)',
      badgeBorder: '#10b981',
      typeColor: '#a7f3d0',
      titleColor: '#FFFFFF',
      messageColor: '#EDE1C9',
      linkColor: '#34d399',
      timeColor: '#9A8E7A',
    },
  },
  SYSTEM: {
    label: 'System',
    defaultIcon: '🔔',
    light: {
      cardBg: '#FFFFFF',
      borderColor: '#722F37',
      badgeBg: '#F7EBEB',
      badgeBorder: '#722F37',
      typeColor: '#722F37',
      titleColor: '#0F2922',
      messageColor: '#2D3A33',
      linkColor: '#722F37',
      timeColor: '#536259',
    },
    dark: {
      cardBg: '#1C160B',
      borderColor: '#ff3b3f',
      badgeBg: 'rgba(255, 59, 63, 0.2)',
      badgeBorder: '#ff3b3f',
      typeColor: '#ffb3ad',
      titleColor: '#FFFFFF',
      messageColor: '#EDE1C9',
      linkColor: '#ff5451',
      timeColor: '#9A8E7A',
    },
  },
  INFO: {
    label: 'Notice',
    defaultIcon: 'ℹ️',
    light: {
      cardBg: '#FFFFFF',
      borderColor: '#D4CDAC',
      badgeBg: '#FBF8ED',
      badgeBorder: '#D4CDAC',
      typeColor: '#3B4A42',
      titleColor: '#0F2922',
      messageColor: '#2D3A33',
      linkColor: '#1D3461',
      timeColor: '#536259',
    },
    dark: {
      cardBg: '#1C160B',
      borderColor: '#3b3423',
      badgeBg: 'rgba(255, 255, 255, 0.1)',
      badgeBorder: '#5d3f3d',
      typeColor: '#EDE1C9',
      titleColor: '#FFFFFF',
      messageColor: '#EDE1C9',
      linkColor: '#ff3b3f',
      timeColor: '#9A8E7A',
    },
  },
};

const ToastContainer = () => {
  const { toasts, removeToast } = useNotifications();
  const { isDark } = useTheme();
  const navigate = useNavigate();

  return (
    <aside
      aria-label="Notifications"
      className="fixed top-22 right-4 sm:right-6 sm:top-24 z-[9999] max-w-sm w-[calc(100vw-2rem)] flex flex-col gap-3 pointer-events-none"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => {
          const config = TYPE_CONFIG[toast.type] || TYPE_CONFIG.INFO;
          const colors = isDark ? config.dark : config.light;
          const icon = toast.icon || config.defaultIcon;

          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: -20, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.2 } }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
              onClick={() => {
                if (toast.link) {
                  navigate(toast.link);
                  removeToast(toast.id);
                }
              }}
              className={`toast-card pointer-events-auto p-4 rounded-2xl border-2 transition-all ${
                toast.link ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]' : ''
              }`}
              style={{
                backgroundColor: colors.cardBg,
                borderColor: colors.borderColor,
                boxShadow: isDark
                  ? '0 20px 48px -4px rgba(0, 0, 0, 0.95), 0 0 16px rgba(255, 255, 255, 0.05)'
                  : '0 20px 44px -4px rgba(16, 36, 31, 0.18), 0 4px 16px rgba(0, 0, 0, 0.08)',
              }}
              role="status"
              aria-live="polite"
            >
              <div className="flex items-start gap-3">
                {/* Icon Badge */}
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 border"
                  style={{
                    backgroundColor: colors.badgeBg,
                    borderColor: colors.badgeBorder,
                  }}
                >
                  {icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pr-1">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span
                      className="text-[10px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded-md border"
                      style={{
                        color: colors.typeColor,
                        backgroundColor: colors.badgeBg,
                        borderColor: colors.badgeBorder,
                      }}
                    >
                      {toast.type || config.label}
                    </span>
                    <span
                      className="text-[10px] font-mono font-medium"
                      style={{ color: colors.timeColor }}
                    >
                      Just now
                    </span>
                  </div>

                  <h5
                    className="font-bold text-[13px] leading-snug tracking-tight"
                    style={{ color: colors.titleColor }}
                  >
                    {toast.title}
                  </h5>
                  <p
                    className="text-[12px] mt-1 leading-relaxed line-clamp-2 font-medium"
                    style={{ color: colors.messageColor }}
                  >
                    {toast.message}
                  </p>

                  {toast.link && (
                    <div
                      className="mt-2.5 flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase hover:underline"
                      style={{ color: colors.linkColor }}
                    >
                      <span>View Details</span>
                      <span>→</span>
                    </div>
                  )}
                </div>

                {/* Dismiss Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeToast(toast.id);
                  }}
                  className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 cursor-pointer border border-[var(--color-border-subtle)] bg-[var(--color-bg-card-hover)] text-[var(--color-text-primary)] hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-all shadow-xs"
                  aria-label="Dismiss notification"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </aside>
  );
};

export default ToastContainer;
