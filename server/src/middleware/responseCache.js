/**
 * Response Cache Middleware
 *
 * Lightweight in-memory cache for high-traffic GET endpoints.
 * Caches successful JSON responses with configurable TTL.
 *
 * Design decisions:
 * - In-memory Map: No external dependency (Redis) needed at club scale.
 * - Auto-eviction: Entries expire on TTL; periodic sweep prevents memory leaks.
 * - Serverless-safe: Cache resets on cold start (ephemeral), which is acceptable
 *   since it still eliminates repeated DB queries during warm execution.
 * - Only caches GET requests with 200 status codes.
 */

const cache = new Map();

// Periodic cleanup to prevent unbounded memory growth
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (entry.expiry <= now) {
      cache.delete(key);
    }
  }
}, CLEANUP_INTERVAL_MS).unref(); // unref() so timer doesn't prevent process exit

/**
 * Factory creating cache middleware with configurable TTL.
 *
 * @param {number} ttlSeconds - Cache time-to-live in seconds (default: 30)
 * @returns {import('express').RequestHandler}
 */
const responseCache = (ttlSeconds = 30) => {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Skip cache in test environment
    if (process.env.NODE_ENV === 'test') {
      return next();
    }

    const key = req.originalUrl;
    const cached = cache.get(key);

    if (cached && cached.expiry > Date.now()) {
      res.setHeader('X-Cache', 'HIT');
      return res.status(200).json(cached.data);
    }

    // Monkey-patch res.json to intercept and cache successful responses
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode === 200 && body) {
        cache.set(key, {
          data: body,
          expiry: Date.now() + ttlSeconds * 1000,
        });
        res.setHeader('X-Cache', 'MISS');
      }
      return originalJson(body);
    };

    next();
  };
};

/**
 * Manually invalidate all cached entries.
 * Call this after match approvals, rating changes, etc. to bust stale data.
 */
const invalidateCache = () => {
  cache.clear();
};

/**
 * Get current cache size (for monitoring/debugging).
 */
const getCacheSize = () => cache.size;

module.exports = {
  responseCache,
  invalidateCache,
  getCacheSize,
};
