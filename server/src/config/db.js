/**
 * MongoDB Connection
 *
 * Connects Mongoose to MongoDB Atlas with retry logic.
 * Logs connection state changes.
 */

const mongoose = require('mongoose');
const { MONGO_URI } = require('./env');

// Defense-in-depth: automatically sanitize query filter inputs against NoSQL operator injection
mongoose.set('sanitizeFilter', true);

let isConnecting = false;

const connectDB = async () => {
  if (isConnecting || mongoose.connection.readyState === 1) return;
  isConnecting = true;

  try {
    const conn = await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log(`\n✅ MongoDB connected successfully: ${conn.connection.host}\n`);
    isConnecting = false;
    return conn;
  } catch (error) {
    isConnecting = false;
    console.error('❌ MongoDB connection failed:', error.message);
    console.warn('⚠️  Retrying connection to MongoDB Atlas in 5 seconds...');
    setTimeout(connectDB, 5000);
  }
};

// Log connection events
mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected. Attempting reconnect...');
  setTimeout(connectDB, 5000);
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected successfully');
});

module.exports = connectDB;
