/**
 * The PickleHub — Express Application
 *
 * Configures middleware stack, routes, and error handlers.
 * Shared between standalone server (server.js) and Vercel serverless (api/index.js).
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const { NODE_ENV, CLIENT_URL } = require('./config/env');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { sanitizeInput } = require('./middleware/sanitizer');
const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/authRoutes');
const playerRoutes = require('./routes/playerRoutes');
const matchRoutes = require('./routes/matchRoutes');
const profileRoutes = require('./routes/profileRoutes');
const adminRoutes = require('./routes/adminRoutes');
const tournamentRoutes = require('./routes/tournamentRoutes');

const app = express();

// ---------------------
// Middleware
// ---------------------

// Security headers
app.use(helmet());

// CORS — support client origin, local dev, Vercel deployments and custom domains
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. same-origin, mobile apps, curl, Postman)
      if (!origin) return callback(null, true);
      if (
        origin === CLIENT_URL ||
        origin.endsWith('.vercel.app') ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1')
      ) {
        return callback(null, true);
      }
      // Reject all other origins — do NOT fall through to an unconditional allow
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

// Request logging
if (NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Cookie parsing (for httpOnly refresh token)
app.use(cookieParser());

// Body parsing — 1mb is sufficient for all JSON endpoints;
// photo uploads use multer (multipart), not the JSON parser.
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Global NoSQL injection sanitization
app.use(sanitizeInput);

// ---------------------
// Routes
// ---------------------

app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/tournaments', tournamentRoutes);

// ---------------------
// Error Handling
// ---------------------

app.use(notFound);
app.use(errorHandler);

module.exports = app;
