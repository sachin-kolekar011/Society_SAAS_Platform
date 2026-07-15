const cloudinary = require('cloudinary').v2;
const env = require('../../config/env');

cloudinary.config({
  cloud_name: env.cloudinary.cloudName,
  api_key: env.cloudinary.apiKey,
  api_secret: env.cloudinary.apiSecret,
});

// Implements storage.interface.js. Uploads a buffer (from multer's memory
// storage, never written to local disk first -- one less thing to clean up
// or leak on a small EC2 instance) via a stream, scoped to a per-tenant
// folder so two tenants' uploads never collide even by coincidence of
// filename.
function upload(fileBuffer, { tenantSlug, folder = 'complaints' }) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: `society-saas/${tenantSlug}/${folder}` },
      (error, result) => {
        if (error) return reject(error);
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    stream.end(fileBuffer);
  });
}

async function deleteFile(publicId) {
  await cloudinary.uploader.destroy(publicId);
}

module.exports = { upload, delete: deleteFile };
