/**
 * User Model
 *
 * Implements User schema (PRD Section 10.1) with password hashing,
 * role-based access control, and account lockout for brute-force protection (Section 5.3).
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [
        function () {
          return !this.googleId;
        },
        'Password is required for email/password authentication',
      ],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Do not return password by default in queries
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    authProvider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local',
    },
    role: {
      type: String,
      enum: {
        values: ['PLAYER', 'ADMIN'],
        message: '{VALUE} is not a valid role',
      },
      default: 'PLAYER',
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lockedUntil: {
      type: Date,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Hash password before saving if modified
userSchema.pre('save', async function (next) {
  if (!this.password || !this.isModified('password')) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

/**
 * Compare candidate password against stored bcrypt hash
 * @param {string} candidatePassword
 * @returns {Promise<boolean>}
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) {
    return false;
  }
  return bcrypt.compare(candidatePassword, this.password);
};

/**
 * Check if the user account is currently locked due to failed attempts
 * @returns {boolean}
 */
userSchema.methods.isLocked = function () {
  return !!(this.lockedUntil && this.lockedUntil > Date.now());
};

/**
 * Handle a failed login attempt; lock account if threshold exceeded
 * @returns {Promise<void>}
 */
userSchema.methods.handleFailedLogin = async function () {
  // If lock expired, reset counter first
  if (this.lockedUntil && this.lockedUntil <= Date.now()) {
    this.failedLoginAttempts = 1;
    this.lockedUntil = null;
  } else {
    this.failedLoginAttempts += 1;
  }

  if (this.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
    this.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
  }

  await this.save({ validateBeforeSave: false });
};

/**
 * Reset failed login attempts upon successful authentication
 * @returns {Promise<void>}
 */
userSchema.methods.handleSuccessfulLogin = async function () {
  if (this.failedLoginAttempts > 0 || this.lockedUntil) {
    this.failedLoginAttempts = 0;
    this.lockedUntil = null;
    await this.save({ validateBeforeSave: false });
  }
};

const User = mongoose.model('User', userSchema);

module.exports = User;
