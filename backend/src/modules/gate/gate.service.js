const QRCode = require('qrcode');
const gateRepository = require('./gate.repository');
const { NotFoundError, UnprocessableError, ForbiddenError } = require('../../errors');
const prisma = require('../../config/database');

async function getOwnResident(tenant, actorUser) {
  const resident = await prisma.resident.findFirst({
    where: { userId: actorUser.id, tenantId: tenant.id, deletedAt: null },
  });
  if (!resident) throw new NotFoundError('Resident profile not found');
  return resident;
}

async function createPass(tenant, actorUser, input) {
  const resident = await getOwnResident(tenant, actorUser);

  if (new Date(input.validUntil) <= new Date(input.validFrom)) {
    throw new UnprocessableError('Valid-until must be after valid-from');
  }

  const pass = await gateRepository.create(tenant.id, resident.id, actorUser.id, input);

  // QR encodes ONLY the opaque token, never the pass id or any resident
  // detail -- scanning it and reading the raw payload reveals nothing
  // useful without hitting the check-in endpoint, which itself requires a
  // WATCHMAN-role token (Phase RBAC pattern extended to this module).
  const qrCodeDataUrl = await QRCode.toDataURL(pass.qrToken, { width: 240, margin: 1 });

  return { ...pass, qrCodeDataUrl };
}

async function listPasses(tenant, actorUser, query) {
  let residentId;
  if (actorUser.role === 'RESIDENT') {
    const resident = await getOwnResident(tenant, actorUser);
    residentId = resident.id;
  }
  // ADMIN and WATCHMAN both see all passes -- watchman needs visibility
  // into pending/expected visitors for the day, not just a scan endpoint.
  return gateRepository.findMany(tenant.id, { ...query, residentId });
}

async function checkIn(tenant, watchmanUser, qrToken) {
  const result = await gateRepository.checkIn(tenant.id, qrToken, watchmanUser.id);
  if (result.error === 'NOT_FOUND') throw new NotFoundError('No visitor pass found for this code');
  if (result.error === 'EXPIRED') throw new UnprocessableError('This pass has expired');
  if (result.error === 'INVALID_STATE') {
    throw new UnprocessableError(`This pass is already ${result.pass.status.toLowerCase().replace('_', ' ')}`);
  }
  return result.pass;
}

async function checkOut(tenant, qrToken) {
  const result = await gateRepository.checkOut(tenant.id, qrToken);
  if (result.error === 'NOT_FOUND') throw new NotFoundError('No visitor pass found for this code');
  if (result.error === 'INVALID_STATE') {
    throw new UnprocessableError(`Cannot check out a pass that is ${result.pass.status.toLowerCase().replace('_', ' ')}`);
  }
  return result.pass;
}

async function cancelPass(tenant, actorUser, passId) {
  const resident = await getOwnResident(tenant, actorUser);
  const cancelled = await gateRepository.cancel(tenant.id, passId, resident.id);
  if (!cancelled) throw new NotFoundError('Pass not found, not yours, or already used');
}

module.exports = { createPass, listPasses, checkIn, checkOut, cancelPass };
