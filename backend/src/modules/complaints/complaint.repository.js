const prisma = require('../../config/database');

// Every method takes tenantId first, mandatory -- see Phase 2 §1 step 7.

async function findCategories(tenantId) {
  return prisma.complaintCategory.findMany({
    where: { tenantId, isActive: true },
    orderBy: { name: 'asc' },
  });
}

async function createComplaint(tenantId, { residentId, categoryId, description, photoUrl }, actorUserId) {
  // Complaint + its first history row created together -- a complaint that
  // exists with zero history rows is an inconsistent state per the Phase 4
  // audit-trail design.
  return prisma.$transaction(async (tx) => {
    const complaint = await tx.complaint.create({
      data: {
        tenantId, residentId, categoryId, description, photoUrl,
        status: 'OPEN',
        createdBy: actorUserId,
      },
    });

    await tx.complaintStatusHistory.create({
      data: {
        tenantId,
        complaintId: complaint.id,
        fromStatus: null,
        toStatus: 'OPEN',
        changedByUserId: actorUserId,
      },
    });

    return complaint;
  });
}

// The overdue computation from Phase 4 §1: computed in JS after fetch,
// not pushed into SQL. Prisma doesn't have a portable computed-column
// syntax for MySQL without $queryRaw, and at society scale (hundreds of
// complaints per tenant, not millions) this is negligible overhead and
// far more debuggable than a raw SQL string living alongside the ORM.
function mapWithOverdue(complaint, overdueThresholdDays) {
  const ageInDays = (Date.now() - new Date(complaint.createdAt).getTime()) / 86_400_000;
  const isOverdue = complaint.status !== 'RESOLVED' && ageInDays > overdueThresholdDays;
  return { ...complaint, isOverdue };
}

async function findMany(tenantId, { residentId, status, categoryId, from, to, page = 1, limit = 20, sortOverdueFirst, overdueThresholdDays }) {
  const where = {
    tenantId,
    deletedAt: null,
    ...(residentId && { residentId }), // set by service when caller is a RESIDENT -- scopes to own complaints only
    ...(status && { status }),
    ...(categoryId && { categoryId }),
    ...((from || to) && {
      createdAt: {
        ...(from && { gte: new Date(from) }),
        ...(to && { lte: new Date(to) }),
      },
    }),
  };

  const include = { category: true, resident: { include: { user: true, flat: true } } };

  if (sortOverdueFirst) {
    // Overdue-ness only exists after the JS-side computation (Phase 4:
    // computed, not stored), so it can't be pushed into an ORDER BY at the
    // database level without a raw query. Fetch the FULL matching set,
    // compute + sort in JS, THEN paginate -- pagination must happen AFTER
    // sorting, not before. Found during audit: the original version
    // applied skip/take at the DB query and only sorted the resulting
    // page, so an overdue complaint on page 2 could never surface to page
    // 1. Fine at society scale (hundreds of rows per tenant); would need
    // a raw SQL ORDER BY expression if a tenant's volume ever made this
    // measurably slow.
    const [allRows, total] = await Promise.all([
      prisma.complaint.findMany({ where, include, orderBy: { createdAt: 'desc' } }),
      prisma.complaint.count({ where }),
    ]);

    const mapped = allRows.map((c) => mapWithOverdue(c, overdueThresholdDays));
    mapped.sort((a, b) => Number(b.isOverdue) - Number(a.isOverdue));

    const start = (page - 1) * limit;
    return { rows: mapped.slice(start, start + limit), total };
  }

  const [rows, total] = await Promise.all([
    prisma.complaint.findMany({
      where,
      include,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.complaint.count({ where }),
  ]);

  const mapped = rows.map((c) => mapWithOverdue(c, overdueThresholdDays));
  return { rows: mapped, total };
}

async function findById(tenantId, complaintId, overdueThresholdDays) {
  const complaint = await prisma.complaint.findFirst({
    where: { id: complaintId, tenantId, deletedAt: null },
    include: {
      category: true,
      resident: { include: { user: true, flat: true } },
      statusHistory: {
        orderBy: { changedAt: 'asc' },
        include: { changedBy: { select: { firstName: true, lastName: true, role: true } } },
      },
    },
  });
  if (!complaint) return null;
  return mapWithOverdue(complaint, overdueThresholdDays);
}

async function updateStatus(tenantId, complaintId, { toStatus, note }, actorUserId) {
  return prisma.$transaction(async (tx) => {
    const complaint = await tx.complaint.findFirst({
      where: { id: complaintId, tenantId, deletedAt: null },
      include: { resident: { include: { user: true } } },
    });
    if (!complaint) return null;

    const updated = await tx.complaint.update({
      where: { id: complaintId },
      data: {
        status: toStatus,
        resolvedAt: toStatus === 'RESOLVED' ? new Date() : complaint.resolvedAt,
        updatedBy: actorUserId,
      },
    });

    await tx.complaintStatusHistory.create({
      data: {
        tenantId,
        complaintId,
        fromStatus: complaint.status,
        toStatus,
        note,
        changedByUserId: actorUserId,
      },
    });

    return { ...updated, resident: complaint.resident, fromStatus: complaint.status };
  });
}

async function updatePriority(tenantId, complaintId, priority, actorUserId) {
  const result = await prisma.complaint.updateMany({
    where: { id: complaintId, tenantId, deletedAt: null },
    data: { priority, updatedBy: actorUserId },
  });
  return result.count > 0;
}

module.exports = {
  findCategories,
  createComplaint,
  findMany,
  findById,
  updateStatus,
  updatePriority,
};
