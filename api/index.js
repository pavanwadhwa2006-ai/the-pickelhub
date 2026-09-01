/**
 * Vercel Serverless API Handler
 *
 * Catches all requests to /api/* and routes them through the Express application.
 * Ensures MongoDB connection is established/cached before handling each request.
 */

const app = require('../server/src/app');
const connectDB = require('../server/src/config/db');

module.exports = async (req, res) => {
  try {
    await connectDB();
  } catch (err) {
    console.error('Serverless DB connection error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Database connection failed. Please ensure MONGO_URI is set in Vercel environment variables.',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }

  return app(req, res);
};
