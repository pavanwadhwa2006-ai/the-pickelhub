/**
 * The PickleHub — Server Entry Point
 *
 * Express application with middleware stack, route mounting,
 * MongoDB connection, and graceful shutdown.
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const connectDB = require('./config/db');
const { PORT, NODE_ENV, CLIENT_URL } = require('./config/env');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/authRoutes');
const playerRoutes = require('./routes/playerRoutes');
const matchRoutes = require('./routes/matchRoutes');
const profileRoutes = require('./routes/profileRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// ---------------------
// Middleware
// ---------------------

// Security headers
app.use(helmet());

// CORS — allow client origin
app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
  })
);

// Request logging
if (NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ---------------------
// Routes
// ---------------------

app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/admin', adminRoutes);

// ---------------------
// Error Handling
// ---------------------

app.use(notFound);
app.use(errorHandler);

// ---------------------
// Start Server
// ---------------------

const startServer = async () => {
  const server = app.listen(PORT, () => {
    console.log(`\n🏓 The PickleHub server running on port ${PORT} [${NODE_ENV}]\n`);
  });

  // Connect to MongoDB
  connectDB().catch((err) => {
    console.error('❌ MongoDB initial connection failed:', err.message);
  });

  // Graceful shutdown
  const shutdown = (signal) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    server.close(() => {
      console.log('🛑 Server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

startServer();

module.exports = app;
