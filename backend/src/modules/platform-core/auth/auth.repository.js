const prisma = require('../../../config/database');

// Every method takes tenantId as an explicit, mandatory argument -- this is
// the isolation-enforcement point described in Phase 2. There is no method
// here that looks up a user by email alone across all tenants (except the
// one explicitly for SUPER_ADMIN, which is tenant-less by design).

async function findUserByEmailInTenant(tenantId, email) {
  return prisma.user.findFirst({
    where: { tenantId, email, deletedAt: null },
  });
}

async function findSuperAdminByEmail(email) {
  return prisma.user.findFirst({
    where: { tenantId: null, email, role: 'SUPER_ADMIN', deletedAt: null },
  });
}

async function findFlatById(tenantId, flatId) {
  return prisma.flat.findFirst({
    where: { id: flatId, tenantId, deletedAt: null },
  });
}

async function createResidentUser(tenantId, { email, passwordHash, firstName, lastName, phone, flatId, residentType }) {
  // Transaction: User + Resident must be created together, or not at all --
  // a User row with no matching Resident row is an inconsistent state that
  // would break every complaint/notice query expecting resident.flat.
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { tenantId, email, passwordHash, firstName, lastName, phone, role: 'RESIDENT' },
    });

    const resident = await tx.resident.create({
      data: { tenantId, userId: user.id, flatId, residentType, isPrimary: true },
    });

    return { user, resident };
  });
}

module.exports = {
  findUserByEmailInTenant,
  findSuperAdminByEmail,
  findFlatById,
  createResidentUser,
};
