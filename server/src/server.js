/**
 * The PickleHub — Server Entry Point (Local / Standalone)
 *
 * Imports Express application from app.js, starts HTTP listener,
 * and initiates MongoDB connection.
 */

const app = require('./app');
const connectDB = require('./config/db');
const { PORT, NODE_ENV } = require('./config/env');

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
