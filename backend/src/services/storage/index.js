// Single switch point -- every caller does `require('.../storage')`, never
// requires cloudinaryStorage.js directly. Changing STORAGE_PROVIDER in .env
// is the entire migration to S3 later.
const env = require('../../config/env');

const providers = {
  cloudinary: require('./cloudinaryStorage'),
  s3: require('./s3Storage'),
};

module.exports = providers[env.storageProvider] || providers.cloudinary;
