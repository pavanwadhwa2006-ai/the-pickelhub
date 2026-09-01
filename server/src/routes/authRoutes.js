/**
 * Auth Routes
 *
 * Mounts endpoints for registration, login, logout, and profile retrieval.
 */

const express = require('express');
const {
  register,
  login,
  googleAuth,
  logout,
  getMe,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/google', authLimiter, googleAuth);
router.post('/logout', logout);
router.get('/me', protect, getMe);

module.exports = router;
