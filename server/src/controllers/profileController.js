/**
 * Profile Controller
 *
 * Handles athlete profile avatar upload and removal.
 * Establishes Player.profilePhoto as the canonical Single Source of Truth.
 */

const { getOrCreatePlayerProfile } = require('../services/playerService');
const { uploadAvatar, deleteAvatar } = require('../services/storageService');

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * @desc    Upload profile photo to Vercel Blob
 * @route   POST /api/profile/photo
 * @access  Private (Protected)
 */
const uploadProfilePhoto = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please select an image file to upload.',
      });
    }

    // 1. Server-side format & size validation
    if (!ALLOWED_MIME_TYPES.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid image format. Allowed formats: PNG, JPEG, WEBP.',
      });
    }

    if (req.file.size > MAX_FILE_SIZE_BYTES) {
      return res.status(400).json({
        success: false,
        message: 'File size exceeds 5MB limit. Please upload a smaller image.',
      });
    }

    // 2. Resolve player profile (Single Source of Truth)
    const player = await getOrCreatePlayerProfile(req.user);

    // 3. Delete previous photo from blob storage if existing
    if (player.profilePhoto) {
      await deleteAvatar(player.profilePhoto);
    }

    // 4. Generate unique filename and upload buffer
    const extension = req.file.mimetype.split('/')[1] || 'jpg';
    const filename = `avatar-${player.playerId}-${Date.now()}.${extension}`;

    const photoUrl = await uploadAvatar(req.file.buffer, filename, req.file.mimetype);

    // 5. Update Player document
    player.profilePhoto = photoUrl;
    await player.save();

    res.status(200).json({
      success: true,
      message: 'Profile photo updated successfully.',
      data: {
        profilePhoto: player.profilePhoto,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Remove profile photo (reverts to initials fallback)
 * @route   DELETE /api/profile/photo
 * @access  Private (Protected)
 */
const deleteProfilePhoto = async (req, res, next) => {
  try {
    const player = await getOrCreatePlayerProfile(req.user);

    if (player.profilePhoto) {
      await deleteAvatar(player.profilePhoto);
      player.profilePhoto = '';
      await player.save();
    }

    res.status(200).json({
      success: true,
      message: 'Profile photo removed. Reverted to initials avatar.',
      data: {
        profilePhoto: '',
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadProfilePhoto,
  deleteProfilePhoto,
};
