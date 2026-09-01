/**
 * Environment Configuration
 *
 * Centralized env-var loader with validation.
 * Fails fast if required variables are missing.
 */

const dotenv = require('dotenv');
const path = require('path');

const fs = require('fs');

// Load .env from server root or monorepo root
const serverEnvPath = path.resolve(__dirname, '../../.env');
const rootEnvPath = path.resolve(__dirname, '../../../.env');

if (fs.existsSync(serverEnvPath)) {
  dotenv.config({ path: serverEnvPath });
}
if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
}

const requiredVars = ['MONGO_URI', 'JWT_SECRET'];

const missing = requiredVars.filter((key) => !process.env[key]);
if (missing.length > 0 && process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  console.error(
    `\n❌ Missing required environment variables:\n   ${missing.join(', ')}\n\n` +
    `   Copy .env.example to .env and fill in real values, or configure in Vercel Project Settings.\n`
  );
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

module.exports = {
  MONGO_URI: process.env.MONGO_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  PORT: parseInt(process.env.PORT, 10) || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  GOOGLE_CLIENT_ID:
    process.env.GOOGLE_CLIENT_ID ||
    '667753727792-uusm1s2podnhrh63s2i7jnduu6auc8s0.apps.googleusercontent.com',
  DEFAULT_K_FACTOR: parseInt(process.env.DEFAULT_K_FACTOR, 10) || 32,
};

