/**
 * PageLoadingSkeleton — Branded Loading State
 *
 * Displayed inside <Suspense fallback> during route-level code-split chunk loading.
 * Matches both Classic Dark and Garden Light themes via CSS variables.
 */

import { motion } from 'framer-motion';

export default function PageLoadingSkeleton() {
  return (
    <div
      className="min-h-[60vh] flex flex-col items-center justify-center p-8"
      role="status"
      aria-label="Loading page"
    >
      {/* Pulsing PickleHub wordmark */}
      <motion.div
        className="flex flex-col items-center gap-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <motion.span
          className="text-3xl sm:text-4xl font-['Playfair_Display'] font-bold"
          style={{ color: 'var(--accent-primary)' }}
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        >
          PickleHub
        </motion.span>

        {/* Skeleton bar animation */}
        <div className="flex gap-1.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: 'var(--accent-primary)' }}
              animate={{
                scale: [1, 1.4, 1],
                opacity: [0.3, 1, 0.3],
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: i * 0.15,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>

        <p
          className="text-xs tracking-[0.15em] uppercase"
          style={{ color: 'var(--text-muted)' }}
        >
          Loading court...
        </p>
      </motion.div>

      {/* Screen reader text */}
      <span className="sr-only">Loading page content, please wait.</span>
    </div>
  );
}
