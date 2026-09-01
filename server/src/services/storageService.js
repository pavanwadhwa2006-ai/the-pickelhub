/**
 * Storage Service
 *
 * Handles file uploads to Vercel Blob (@vercel/blob) for serverless compatibility.
 * Provides fallback data-URI encoding for offline/test environments where BLOB_READ_WRITE_TOKEN is not set.
 */

const { put, del } = require('@vercel/blob');

/**
 * Uploads an avatar image buffer to Vercel Blob or fallback handler.
 * @param {Buffer} buffer - File buffer from multer memory storage
 * @param {string} filename - Unique filename
 * @param {string} contentType - Image MIME type (e.g. 'image/jpeg')
 * @returns {Promise<string>} - Public URL of the uploaded image
 */
const uploadAvatar = async (buffer, filename, contentType) => {
  if (!buffer || buffer.length === 0) {
    throw new Error('Image buffer is empty');
  }

  // Vercel Blob upload in production or when token is present
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`avatars/${filename}`, buffer, {
      access: 'public',
      contentType,
    });
    return blob.url;
  }

  // Offline / local development / test fallback
  return `data:${contentType};base64,${buffer.toString('base64')}`;
};

/**
 * Deletes an avatar from Vercel Blob storage.
 * @param {string} photoUrl - Public URL of the blob to delete
 * @returns {Promise<void>}
 */
const deleteAvatar = async (photoUrl) => {
  if (!photoUrl || typeof photoUrl !== 'string') return;

  if (photoUrl.startsWith('http') && process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      await del(photoUrl);
    } catch (err) {
      console.warn('⚠️ Vercel Blob deletion notice:', err.message);
    }
  }
};

module.exports = {
  uploadAvatar,
  deleteAvatar,
};
