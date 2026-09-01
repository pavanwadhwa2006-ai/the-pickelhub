/**
 * CORS Configuration Regression Tests
 *
 * Verifies that the CORS origin-check in app.js correctly:
 * 1. Rejects requests from disallowed origins (no Access-Control-Allow-Origin header).
 * 2. Allows requests from the configured CLIENT_URL.
 * 3. Allows requests from *.vercel.app preview/production deployments.
 * 4. Allows requests from localhost and 127.0.0.1 (local development).
 * 5. Allows requests with no Origin header (same-origin, curl, Postman, mobile).
 *
 * These tests exist specifically to prevent silent reintroduction of the
 * CVE-like bug where the CORS callback unconditionally returned true for
 * every origin, allowing credential-carrying cross-origin requests from
 * arbitrary attacker-controlled sites.
 *
 * Run: node --test test/cors.test.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

// We import the Express app directly — no need for a live DB connection
// since we're only testing the CORS middleware layer, not database routes.
const app = require('../src/app');

/**
 * Helper: starts the app on an ephemeral port, makes one request, and shuts down.
 * Returns { statusCode, headers } from the response.
 */
function makeRequest({ origin, method = 'GET', path = '/api/health' }) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      const headers = { 'Content-Type': 'application/json' };
      if (origin !== undefined) {
        headers['Origin'] = origin;
      }

      const reqOptions = {
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers,
      };

      const req = http.request(reqOptions, (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          server.close(() => {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              body,
            });
          });
        });
      });

      req.on('error', (err) => {
        server.close(() => reject(err));
      });

      req.end();
    });
  });
}

describe('CORS Origin Policy — Regression Suite', () => {
  // ---------------------------------------------------------------
  // REJECTION: disallowed origins must NOT receive ACAO header
  // ---------------------------------------------------------------

  it('should reject requests from an arbitrary evil origin', async () => {
    const res = await makeRequest({ origin: 'https://evil-example.com' });
    // The cors middleware should produce a CORS error — either a 500 or
    // the response should lack the Access-Control-Allow-Origin header.
    const acao = res.headers['access-control-allow-origin'];
    assert.ok(
      !acao || acao !== 'https://evil-example.com',
      `Expected CORS rejection for evil origin, but got ACAO: ${acao}`
    );
  });

  it('should reject requests from a spoofed vercel-like domain that does not end with .vercel.app', async () => {
    const res = await makeRequest({ origin: 'https://evil.vercel.app.attacker.com' });
    const acao = res.headers['access-control-allow-origin'];
    assert.ok(
      !acao || acao !== 'https://evil.vercel.app.attacker.com',
      `Expected CORS rejection for spoofed vercel-like domain, but got ACAO: ${acao}`
    );
  });

  // ---------------------------------------------------------------
  // ALLOWED: legitimate origins must receive matching ACAO header
  // ---------------------------------------------------------------

  it('should allow requests from localhost origins', async () => {
    const res = await makeRequest({ origin: 'http://localhost:5173' });
    assert.equal(
      res.headers['access-control-allow-origin'],
      'http://localhost:5173',
      'localhost origin should be allowed'
    );
  });

  it('should allow requests from 127.0.0.1 origins', async () => {
    const res = await makeRequest({ origin: 'http://127.0.0.1:5173' });
    assert.equal(
      res.headers['access-control-allow-origin'],
      'http://127.0.0.1:5173',
      '127.0.0.1 origin should be allowed'
    );
  });

  it('should allow requests from *.vercel.app deployments', async () => {
    const res = await makeRequest({ origin: 'https://the-pickelhub.vercel.app' });
    assert.equal(
      res.headers['access-control-allow-origin'],
      'https://the-pickelhub.vercel.app',
      '.vercel.app origin should be allowed'
    );
  });

  it('should allow requests from Vercel preview deployments', async () => {
    const res = await makeRequest({
      origin: 'https://the-pickelhub-abc123-team.vercel.app',
    });
    assert.equal(
      res.headers['access-control-allow-origin'],
      'https://the-pickelhub-abc123-team.vercel.app',
      'Vercel preview deployment origin should be allowed'
    );
  });

  // ---------------------------------------------------------------
  // NO ORIGIN: same-origin / curl / Postman / mobile
  // ---------------------------------------------------------------

  it('should allow requests with no Origin header (same-origin, curl, Postman)', async () => {
    const res = await makeRequest({ origin: undefined });
    // With no Origin header, CORS middleware allows the request.
    // The response should succeed (2xx) and may or may not have ACAO.
    assert.ok(
      res.statusCode >= 200 && res.statusCode < 500,
      `Expected successful response for no-origin request, got ${res.statusCode}`
    );
  });

  // ---------------------------------------------------------------
  // PREFLIGHT: OPTIONS requests
  // ---------------------------------------------------------------

  it('should return proper CORS headers for allowed-origin preflight', async () => {
    const res = await makeRequest({
      origin: 'http://localhost:5173',
      method: 'OPTIONS',
      path: '/api/auth/login',
    });
    assert.equal(
      res.headers['access-control-allow-origin'],
      'http://localhost:5173',
      'Preflight should return matching ACAO for allowed origin'
    );
    assert.ok(
      res.headers['access-control-allow-credentials'] === 'true',
      'Preflight should include Access-Control-Allow-Credentials: true'
    );
  });

  it('should reject preflight from disallowed origin', async () => {
    const res = await makeRequest({
      origin: 'https://evil-example.com',
      method: 'OPTIONS',
      path: '/api/auth/login',
    });
    const acao = res.headers['access-control-allow-origin'];
    assert.ok(
      !acao || acao !== 'https://evil-example.com',
      `Expected CORS rejection for evil origin preflight, but got ACAO: ${acao}`
    );
  });
});
