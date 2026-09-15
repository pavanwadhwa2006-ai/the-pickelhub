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

const TYPE_STYLES = {
  MATCH: {
    borderColor: 'var(--color-accent-primary, #ff3b3f)',
    badgeBg: 'rgba(255, 59, 63, 0.15)',
    textColor: '#ffb3ad',
    defaultIcon: '🏓',
  },
  TOURNAMENT: {
    borderColor: '#f59e0b',
    badgeBg: 'rgba(245, 158, 11, 0.15)',
    textColor: '#fde68a',
    defaultIcon: '🏆',
  },
  ADMIN: {
    borderColor: '#a855f7',
    badgeBg: 'rgba(168, 85, 247, 0.15)',
    textColor: '#e9d5ff',
    defaultIcon: '👑',
  },
  CHALLENGE: {
    borderColor: '#10b981',
    badgeBg: 'rgba(16, 185, 129, 0.15)',
    textColor: '#a7f3d0',
    defaultIcon: '⚡',
  },
  SYSTEM: {
    borderColor: 'var(--color-nav-accent, #ede1c9)',
    badgeBg: 'rgba(237, 225, 201, 0.15)',
    textColor: '#ede1c9',
    defaultIcon: '🔔',
  },
  INFO: {
    borderColor: 'var(--color-border-subtle, #3b3423)',
    badgeBg: 'rgba(255, 255, 255, 0.08)',
    textColor: 'var(--color-text-primary, #ede1c9)',
    defaultIcon: 'ℹ️',
  },
};

const ToastContainer = () => {
  const { toasts, removeToast } = useNotifications();
  const navigate = useNavigate();

  return (
    <aside
      aria-label="Notifications"
      className="fixed top-22 right-4 sm:right-6 sm:top-24 z-[9999] max-w-sm w-[calc(100vw-2rem)] flex flex-col gap-3 pointer-events-none"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => {
          const style = TYPE_STYLES[toast.type] || TYPE_STYLES.INFO;
          const icon = toast.icon || style.defaultIcon;

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
              className={`pointer-events-auto p-4 rounded-2xl shadow-2xl border backdrop-blur-xl transition-all ${
                toast.link ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]' : ''
              }`}
              style={{
                backgroundColor: 'rgba(20, 15, 2, 0.95)',
                borderColor: style.borderColor,
                boxShadow: '0 12px 36px -4px rgba(0, 0, 0, 0.7), 0 0 16px rgba(255, 59, 63, 0.12)',
              }}
              role="status"
              aria-live="polite"
            >
              <div className="flex items-start gap-3">
                {/* Icon Badge */}
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0 border"
                  style={{
                    backgroundColor: style.badgeBg,
                    borderColor: style.borderColor,
                  }}
                >
                  {icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span
                      className="text-[10px] font-mono font-bold tracking-wider uppercase"
                      style={{ color: style.textColor }}
                    >
                      {toast.type}
                    </span>
                    <span className="text-[10px] text-[var(--color-text-muted,#9a8e7a)] font-mono">
                      Just now
                    </span>
                  </div>

                  <h5 className="font-bold text-xs text-[var(--color-text-primary,#ede1c9)] leading-snug">
                    {toast.title}
                  </h5>
                  <p className="text-[11px] text-[var(--color-text-secondary,#d8cdb5)] mt-0.5 leading-relaxed line-clamp-2">
                    {toast.message}
                  </p>

                  {toast.link && (
                    <div className="mt-1.5 flex items-center gap-1 text-[10px] font-bold tracking-wider text-[var(--color-accent-primary,#ff3b3f)] uppercase">
                      <span>View Details</span>
                      <span>→</span>
                    </div>
                  )}
                </div>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeToast(toast.id);
                  }}
                  className="text-[var(--color-text-muted,#9a8e7a)] hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0"
                  aria-label="Dismiss notification"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
