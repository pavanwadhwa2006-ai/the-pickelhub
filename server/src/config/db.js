/**
 * MongoDB Connection
 *
 * Connects Mongoose to MongoDB Atlas with connection caching for Serverless environments
 * and retry logic for standalone servers.
 */

const mongoose = require('mongoose');
const { MONGO_URI } = require('./env');


// Global connection cache for serverless environments (e.g. Vercel)
let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  // If already connected, return existing connection
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      serverSelectionTimeoutMS: 5000,
    };

    cached.promise = mongoose
      .connect(MONGO_URI, opts)
      .then((mongooseInstance) => {
        console.log(`\n✅ MongoDB connected successfully: ${mongooseInstance.connection.host}\n`);
        return mongooseInstance;
      })
      .catch((err) => {
        cached.promise = null;
        throw err;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
      console.warn('⚠️  Retrying connection to MongoDB Atlas in 5 seconds...');
      setTimeout(connectDB, 5000);
    }
    throw error;
  }

  return cached.conn;
};

// Log connection events
mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected.');
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected successfully');
});

module.exports = connectDB;
