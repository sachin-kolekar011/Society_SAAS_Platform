// Not wired in for MVP -- written now so the interface is proven against
// two real implementations, not just one (a Strategy pattern with a single
// concrete class is unverified). Swap in Phase 12 by changing one line in
// storage/index.js, once real AWS usage justifies moving off Cloudinary's
// free tier.
//
// const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
// const client = new S3Client({ region: env.aws.region });
//
// async function upload(fileBuffer, { tenantSlug, folder = 'complaints' }) {
//   const key = `${tenantSlug}/${folder}/${Date.now()}-${crypto.randomUUID()}`;
//   await client.send(new PutObjectCommand({
//     Bucket: env.aws.s3Bucket, Key: key, Body: fileBuffer,
//   }));
//   return { url: `https://${env.aws.s3Bucket}.s3.amazonaws.com/${key}`, publicId: key };
// }
//
// async function deleteFile(publicId) {
//   await client.send(new DeleteObjectCommand({ Bucket: env.aws.s3Bucket, Key: publicId }));
// }

module.exports = {
  upload: () => { throw new Error('S3 storage adapter not yet implemented -- see Phase 12'); },
  delete: () => { throw new Error('S3 storage adapter not yet implemented -- see Phase 12'); },
};
