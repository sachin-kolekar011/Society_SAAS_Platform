const multer = require('multer');
const { ValidationError } = require('../errors');

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

// Memory storage, not disk -- the buffer goes straight to Cloudinary
// (storage adapter) and is discarded, never written to the EC2 instance's
// disk. Keeps the box stateless and avoids a slow disk-cleanup cron job.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(new ValidationError('Photo must be a JPEG, PNG, or WebP image'));
    }
    cb(null, true);
  },
});

module.exports = upload;
