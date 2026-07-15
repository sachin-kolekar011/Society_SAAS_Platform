const prisma = require('../../config/database');

async function findMany(tenantId, { page = 1, limit = 20 }) {
  const where = { tenantId, deletedAt: null };
  const [rows, total] = await Promise.all([
    prisma.notice.findMany({
      where,
      orderBy: [{ isImportant: 'desc' }, { createdAt: 'desc' }], // pinned first, then newest -- Phase 4's index supports this exact order
      skip: (page - 1) * limit,
      take: limit,
      include: { postedBy: { select: { firstName: true, lastName: true } } },
    }),
    prisma.notice.count({ where }),
  ]);
  return { rows, total };
}

async function create(tenantId, { title, body, isImportant }, postedByUserId) {
  return prisma.notice.create({
    data: { tenantId, title, body, isImportant: !!isImportant, postedByUserId },
  });
}

async function update(tenantId, noticeId, data) {
  const result = await prisma.notice.updateMany({
    where: { id: noticeId, tenantId, deletedAt: null },
    data,
  });
  return result.count > 0;
}

async function softDelete(tenantId, noticeId) {
  const result = await prisma.notice.updateMany({
    where: { id: noticeId, tenantId, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  return result.count > 0;
}

async function findActiveResidentsWithUsers(tenantId) {
  return prisma.resident.findMany({
    where: { tenantId, deletedAt: null, user: { isActive: true, deletedAt: null } },
    include: { user: true },
  });
}

module.exports = { findMany, create, update, softDelete, findActiveResidentsWithUsers };
