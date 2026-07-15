// Every storage adapter implements this shape. Callers (complaint.service.js)
// depend on this interface, never on Cloudinary or S3 directly -- that's
// what makes swapping providers a config change (Phase 1 §5.4) instead of
// touching every call site.
//
// upload(fileBuffer, options) -> Promise<{ url, publicId }>
// delete(publicId)            -> Promise<void>
module.exports = {};
