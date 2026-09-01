/**
 * Profile Photo Upload Test Suite
 *
 * Tests the Vercel Blob storage service integration, image validation rules,
 * and avatar removal handler.
 *
 * Run: node --test test/profile.test.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// Set dummy env variables for test
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-1234567890';
process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/picklehub_test';
process.env.NODE_ENV = 'test';

const { uploadAvatar, deleteAvatar } = require('../src/services/storageService');

describe('Profile Photo & Storage Service Tests', () => {
  describe('Avatar Buffer Upload', () => {
    it('should successfully process a valid JPEG image buffer', async () => {
      const mockBuffer = Buffer.from('fake-jpeg-image-binary-data');
      const filename = 'avatar-PH-00001-123456789.jpg';
      const contentType = 'image/jpeg';

      const url = await uploadAvatar(mockBuffer, filename, contentType);

      assert.ok(url);
      assert.ok(typeof url === 'string');
      // In test mode without BLOB_READ_WRITE_TOKEN, it returns a data-URI
      assert.ok(url.startsWith('data:image/jpeg;base64,') || url.startsWith('https://'));
    });

    it('should successfully process a valid PNG image buffer', async () => {
      const mockBuffer = Buffer.from('fake-png-image-binary-data');
      const filename = 'avatar-PH-00002-123456789.png';
      const contentType = 'image/png';

      const url = await uploadAvatar(mockBuffer, filename, contentType);

      assert.ok(url);
      assert.ok(url.startsWith('data:image/png;base64,') || url.startsWith('https://'));
    });

    it('should reject an empty image buffer', async () => {
      await assert.rejects(
        async () => {
          await uploadAvatar(Buffer.from(''), 'empty.jpg', 'image/jpeg');
        },
        (err) => {
          assert.match(err.message, /Image buffer is empty/);
          return true;
        }
      );
    });
  });

  describe('Avatar Deletion', () => {
    it('should safely handle deleteAvatar with empty or null URL without throwing', async () => {
      await assert.doesNotReject(async () => {
        await deleteAvatar('');
        await deleteAvatar(null);
        await deleteAvatar(undefined);
      });
    });

    it('should safely handle deleteAvatar for a mock photo URL', async () => {
      await assert.doesNotReject(async () => {
        await deleteAvatar('https://blob.vercel-storage.com/avatars/avatar-PH-00001.jpg');
      });
    });
  });
});
