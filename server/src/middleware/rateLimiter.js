/**
 * Rate Limiter Middleware
 *
 * Atomic, persistent rate limiting using MongoDB and TTL indexing.
 * Prevents race conditions across stateless serverless instances (Vercel)
 * via atomic findOneAndUpdate with $inc.
 *
 * Standard 429 Too Many Requests response with Retry-After header.
 */

const RateLimit = require('../models/RateLimit');

const inMemoryStores = new Map();

// Periodic cleanup of expired in-memory rate limit entries (every 5 mins)
if (process.env.NODE_ENV !== 'test') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of inMemoryStores.entries()) {
      if (record.expiresAt <= now) {
        inMemoryStores.delete(key);
      }
    }
  }, 5 * 60 * 1000).unref();
}

/**
 * Factory creating rate-limiting middleware with atomic MongoDB or in-memory counters.
 *
 * @param {object} options
 * @param {number} options.windowMs - Rate window in milliseconds (e.g. 15 * 60 * 1000)
 * @param {number} options.max      - Max allowed requests within window
 * @param {string} options.prefix   - Namespace prefix for the limiter key
 * @param {string} [options.message] - Custom user-facing message on rate limit exceeded
 * @param {boolean} [options.inMemory] - If true, uses ultra-fast in-memory sliding window
 * @returns {import('express').RequestHandler}
 */
const createRateLimiter = ({
  windowMs = 15 * 60 * 1000,
  max = 5,
  prefix = 'rl',
  message = 'Too many requests. Please try again later.',
  inMemory = false,
}) => {
  return async (req, res, next) => {
    // In test environment without active MongoDB connection or when disabled
    if (process.env.NODE_ENV === 'test' && !process.env.TEST_RATE_LIMIT) {
      return next();
    }

    try {
      const clientIp =
        req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.ip ||
        req.socket.remoteAddress ||
        '127.0.0.1';

      const key = `${prefix}:${clientIp}`;
      const now = Date.now();
      let record;

      if (inMemory) {
        // Ultra-fast in-memory counter (sub-millisecond, zero database overhead)
        let mem = inMemoryStores.get(key);
        if (!mem || mem.expiresAt <= now) {
          mem = { count: 1, expiresAt: now + windowMs };
        } else {
          mem.count++;
        }
        inMemoryStores.set(key, mem);
        record = mem;
      } else {
        // Atomic findOneAndUpdate with $inc and $setOnInsert to eliminate race conditions
        const expiresAt = new Date(now + windowMs);
        record = await RateLimit.findOneAndUpdate(
          { key },
          {
            $inc: { count: 1 },
            $setOnInsert: { expiresAt },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      }

      const resetTimeSec = Math.ceil(new Date(record.expiresAt).getTime() / 1000);
      const remainingSec = Math.max(1, Math.ceil((new Date(record.expiresAt).getTime() - now) / 1000));
      const remainingHits = Math.max(0, max - record.count);

      // Standard RateLimit headers
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', remainingHits);
      res.setHeader('X-RateLimit-Reset', resetTimeSec);

      if (record.count > max) {
        res.setHeader('Retry-After', remainingSec);

        console.warn(`⚠️ [RateLimit Block] IP: ${clientIp}, Key: ${key}, Count: ${record.count}/${max}, RetryAfter: ${remainingSec}s`);

        return res.status(429).json({
          success: false,
          message: `${message} Retry after ${remainingSec} second${remainingSec === 1 ? '' : 's'}.`,
          retryAfter: remainingSec,
        });
      }

      next();
    } catch (err) {
      // INTENTIONAL FAIL-OPEN: If the rate-limit DB query fails (e.g. transient
      // Atlas hiccup), we let the request through rather than blocking all logins.
      // This is a deliberate tradeoff — availability over strict enforcement during
      // a DB outage. Do NOT change to fail-closed without understanding the impact.
      console.error(`[RATE_LIMITER_DOWN] Rate limiter DB error for prefix="${prefix}": ${err.message}`);
      next();
    }
  };
};

// 1. Auth Limiter: 5 attempts per 15 minutes (PRD Section 5.3 & Master Plan Part C)
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  prefix: 'auth',
  message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.',
});

// 2. Match Submission Limiter: 100 requests per 15 minutes (PRD Section 5.3 & Master Plan Part C)
const matchSubmitLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  prefix: 'match_submit',
  message: 'Match submission rate limit exceeded from this IP.',
});

// 3. Global API Limiter: 200 requests per 15 minutes (Milestone 10 — Traffic Resilience)
// In-memory sliding window for sub-millisecond throughput on public endpoints
const globalApiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 200,
  prefix: 'global_api',
  message: 'Too many requests from this IP. Please slow down.',
  inMemory: true,
});

module.exports = {
  createRateLimiter,
  authLimiter,
  matchSubmitLimiter,
  globalApiLimiter,
};
