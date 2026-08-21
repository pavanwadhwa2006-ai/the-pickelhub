/**
 * Health Check Routes
 *
 * GET /api/health — returns server and DB connection status.
 */

const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

router.get('/health', (req, res) => {
  const dbStates = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const dbState = dbStates[mongoose.connection.readyState] || 'unknown';

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    db: dbState,
    uptime: `${Math.floor(process.uptime())}s`,
  });
});

module.exports = router;
