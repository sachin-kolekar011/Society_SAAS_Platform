const prisma = require('../../config/database');

async function generateForAllFlats(tenantId, { billingPeriod, amount, dueDate }) {
  const flats = await prisma.flat.findMany({ where: { tenantId, deletedAt: null } });

  // skipDuplicates relies on the @@unique([tenantId, flatId, billingPeriod])
  // constraint from the schema -- calling "generate" twice for the same
  // month is a no-op for flats that already have a bill, not a duplicate
  // or an error. Idempotent by construction, not by a pre-check.
  const result = await prisma.maintenanceBill.createMany({
    data: flats.map((flat) => ({
      tenantId, flatId: flat.id, billingPeriod, amount, dueDate: new Date(dueDate),
    })),
    skipDuplicates: true,
  });

  return { flatsCount: flats.length, billsCreated: result.count };
}

async function findMany(tenantId, { flatId, status, page = 1, limit = 20 }) {
  const where = { tenantId, deletedAt: null, ...(flatId && { flatId }), ...(status && { status }) };
  const [rows, total] = await Promise.all([
    prisma.maintenanceBill.findMany({
      where, include: { flat: true },
      orderBy: { dueDate: 'desc' },
      skip: (page - 1) * limit, take: limit,
    }),
    prisma.maintenanceBill.count({ where }),
  ]);
  return { rows, total };
}

async function findById(tenantId, id) {
  return prisma.maintenanceBill.findFirst({ where: { id, tenantId, deletedAt: null }, include: { flat: true, payments: true } });
}

async function markPaid(tenantId, billId) {
  return prisma.maintenanceBill.updateMany({
    where: { id: billId, tenantId, deletedAt: null },
    data: { status: 'PAID' },
  });
}

async function createPayment(tenantId, billId, residentId, amount, providerOrderId) {
  return prisma.payment.create({
    data: { tenantId, billId, residentId, amount, providerOrderId, status: 'CREATED' },
  });
}

async function findPaymentByOrderId(tenantId, providerOrderId) {
  return prisma.payment.findFirst({ where: { tenantId, providerOrderId } });
}

async function markPaymentResult(paymentId, status, providerPaymentId) {
  return prisma.payment.update({
    where: { id: paymentId },
    data: { status, providerPaymentId, paidAt: status === 'SUCCESS' ? new Date() : null },
  });
}

module.exports = { generateForAllFlats, findMany, findById, markPaid, createPayment, findPaymentByOrderId, markPaymentResult };
