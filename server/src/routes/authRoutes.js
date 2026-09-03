/**
 * Auth Routes
 *
 * Mounts endpoints for registration, login, logout, token refresh, and profile retrieval.
 */

const express = require('express');
const {
  register,
  login,
  googleAuth,
  logout,
  refresh,
  getMe,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/google', authLimiter, googleAuth);
router.post('/logout', logout);
router.post('/refresh', refresh);
router.get('/me', protect, getMe);

module.exports = router;
