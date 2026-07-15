const billingRepository = require('./billing.repository');
const razorpayAdapter = require('./razorpay.adapter');
const prisma = require('../../config/database');
const { NotFoundError, ForbiddenError, UnprocessableError } = require('../../errors');

async function generateBills(tenantId, input) {
  return billingRepository.generateForAllFlats(tenantId, input);
}

async function listBills(tenant, actorUser, query) {
  let flatId = query.flatId;
  if (actorUser.role === 'RESIDENT') {
    const resident = await prisma.resident.findFirst({
      where: { userId: actorUser.id, tenantId: tenant.id, deletedAt: null },
    });
    if (!resident) throw new NotFoundError('Resident profile not found');
    flatId = resident.flatId; // residents only ever see their own flat's bills, never a query param's value
  }
  return billingRepository.findMany(tenant.id, { ...query, flatId });
}

async function createPaymentOrder(tenant, actorUser, billId) {
  const resident = await prisma.resident.findFirst({
    where: { userId: actorUser.id, tenantId: tenant.id, deletedAt: null },
  });
  if (!resident) throw new NotFoundError('Resident profile not found');

  const bill = await billingRepository.findById(tenant.id, billId);
  if (!bill) throw new NotFoundError('Bill not found');
  if (bill.flatId !== resident.flatId) throw new ForbiddenError('This bill does not belong to your flat');
  if (bill.status === 'PAID') throw new UnprocessableError('This bill is already paid');

  const totalAmount = bill.amount + bill.penaltyAmount;
  const razorpayOrder = await razorpayAdapter.createOrder(totalAmount, `bill_${bill.id}`);
  const payment = await billingRepository.createPayment(tenant.id, bill.id, resident.id, totalAmount, razorpayOrder.id);

  return { paymentId: payment.id, razorpayOrderId: razorpayOrder.id, amount: totalAmount, keyId: process.env.RAZORPAY_KEY_ID };
}

async function verifyPayment(tenant, { paymentId, razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
  const isValid = razorpayAdapter.verifySignature({ razorpayOrderId, razorpayPaymentId, razorpaySignature });
  if (!isValid) {
    // A failed signature check is treated as a failed payment, not a
    // generic error -- this is the exact scenario the signature exists to
    // catch (a forged success callback), so it should record as FAILED,
    // not just reject the HTTP request and leave the Payment row dangling
    // in CREATED forever.
    await billingRepository.markPaymentResult(paymentId, 'FAILED', razorpayPaymentId);
    throw new UnprocessableError('Payment verification failed');
  }

  // Payment success + bill marked paid together -- a payment recorded as
  // SUCCESS while its bill still shows PENDING is exactly the kind of
  // inconsistent state the transactional pattern (Phase 9) exists to
  // prevent.
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  await prisma.$transaction([
    prisma.payment.update({ where: { id: paymentId }, data: { status: 'SUCCESS', providerPaymentId: razorpayPaymentId, paidAt: new Date() } }),
    prisma.maintenanceBill.update({ where: { id: payment.billId }, data: { status: 'PAID' } }),
  ]);

  return { success: true };
}

module.exports = { generateBills, listBills, createPaymentOrder, verifyPayment };
