/**
 * NoSQL Injection Sanitizer Middleware
 *
 * Strips keys containing $ and . characters from req.body, req.query, and req.params
 * to prevent NoSQL operator injection attacks (OWASP A05 & CVE-2025-23061 defense).
 */

const sanitizeObject = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    // Strip keys starting with $ (MongoDB query operators) or containing . (path traversal)
    if (key.startsWith('$') || key.includes('.')) {
      console.warn(`⚠️ [NoSQL Injection Block] Sanitized suspicious key: "${key}"`);
      continue;
    }

    if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};

const sanitizeInput = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeObject(req.params);
  }
  next();
};

module.exports = {
  sanitizeObject,
  sanitizeInput,
};
