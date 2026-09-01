/**
 * Profile Routes
 *
 * Mounts endpoints for profile picture uploads (Vercel Blob) and avatar removal.
 */

const express = require('express');
const multer = require('multer');
const { uploadProfilePhoto, deleteProfilePhoto } = require('../controllers/profileController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Configure Multer with in-memory storage (serverless compatible)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PNG, JPEG, and WEBP image files are allowed.'));
    }
  },
});

router.use(protect);

router.post('/photo', upload.single('photo'), uploadProfilePhoto);
router.delete('/photo', deleteProfilePhoto);

module.exports = router;
