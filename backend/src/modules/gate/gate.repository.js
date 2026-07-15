const prisma = require('../../config/database');
const crypto = require('crypto');

function generateQrToken() {
  // 32 bytes of randomness, hex-encoded -- unguessable, and deliberately
  // NOT the database id (Phase 4 convention: qrToken is opaque, so a QR
  // code photographed by someone other than the watchman reveals nothing
  // about the pass's internal id or sequence).
  return crypto.randomBytes(24).toString('hex');
}

async function create(tenantId, residentId, approvedByUserId, { visitorName, visitorPhone, purpose, validFrom, validUntil }) {
  return prisma.visitorPass.create({
    data: {
      tenantId, residentId, approvedByUserId,
      visitorName, visitorPhone, purpose,
      validFrom: new Date(validFrom),
      validUntil: new Date(validUntil),
      qrToken: generateQrToken(),
    },
  });
}

async function findMany(tenantId, { residentId, status, page = 1, limit = 20 }) {
  const where = {
    tenantId,
    deletedAt: null,
    ...(residentId && { residentId }),
    ...(status && { status }),
  };
  const [rows, total] = await Promise.all([
    prisma.visitorPass.findMany({
      where,
      include: { resident: { include: { user: true, flat: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.visitorPass.count({ where }),
  ]);
  return { rows, total };
}

async function findByQrToken(tenantId, qrToken) {
  return prisma.visitorPass.findFirst({
    where: { tenantId, qrToken, deletedAt: null },
    include: { resident: { include: { user: true, flat: true } } },
  });
}

async function findById(tenantId, id) {
  return prisma.visitorPass.findFirst({
    where: { id, tenantId, deletedAt: null },
    include: { resident: { include: { user: true, flat: true } } },
  });
}

async function checkIn(tenantId, qrToken, watchmanUserId) {
  const pass = await findByQrToken(tenantId, qrToken);
  if (!pass) return { error: 'NOT_FOUND' };
  if (pass.status !== 'PENDING') return { error: 'INVALID_STATE', pass };
  if (new Date() > pass.validUntil) return { error: 'EXPIRED', pass };

  const updated = await prisma.visitorPass.update({
    where: { id: pass.id },
    data: { status: 'CHECKED_IN', checkedInAt: new Date(), checkedInByUserId: watchmanUserId },
  });
  return { pass: updated };
}

async function checkOut(tenantId, qrToken) {
  const pass = await findByQrToken(tenantId, qrToken);
  if (!pass) return { error: 'NOT_FOUND' };
  if (pass.status !== 'CHECKED_IN') return { error: 'INVALID_STATE', pass };

  const updated = await prisma.visitorPass.update({
    where: { id: pass.id },
    data: { status: 'CHECKED_OUT', checkedOutAt: new Date() },
  });
  return { pass: updated };
}

async function cancel(tenantId, id, residentId) {
  const result = await prisma.visitorPass.updateMany({
    where: { id, tenantId, residentId, status: 'PENDING', deletedAt: null },
    data: { status: 'CANCELLED' },
  });
  return result.count > 0;
}

module.exports = { create, findMany, findByQrToken, findById, checkIn, checkOut, cancel };
