const express = require('express');
const { z } = require('zod');
const asyncHandler = require('../../utils/asyncHandler');
const billingService = require('./billing.service');
const authMiddleware = require('../../middlewares/auth.middleware');
const requireRole = require('../../middlewares/rbac.middleware');
const validate = require('../../middlewares/validate.middleware');

const router = express.Router();
router.use(authMiddleware);

const generateBillsSchema = z.object({
  body: z.object({
    billingPeriod: z.string().regex(/^\d{4}-\d{2}$/, 'Use YYYY-MM format'),
    amount: z.number().int().positive(), // paise
    dueDate: z.string().datetime(),
  }),
});

router.post('/bills/generate', requireRole('ADMIN'), validate(generateBillsSchema), asyncHandler(async (req, res) => {
  const result = await billingService.generateBills(req.tenant.id, req.body);
  res.status(201).json({ success: true, data: result });
}));

router.get('/bills', requireRole('ADMIN', 'RESIDENT'), asyncHandler(async (req, res) => {
  const { rows, total } = await billingService.listBills(req.tenant, req.user, req.query);
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  res.status(200).json({ success: true, data: rows, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
}));

router.post('/bills/:id/pay/order', requireRole('RESIDENT'), asyncHandler(async (req, res) => {
  const order = await billingService.createPaymentOrder(req.tenant, req.user, req.params.id);
  res.status(201).json({ success: true, data: order });
}));

const verifyPaymentSchema = z.object({
  body: z.object({
    paymentId: z.string(),
    razorpayOrderId: z.string(),
    razorpayPaymentId: z.string(),
    razorpaySignature: z.string(),
  }),
});

router.post('/payments/verify', requireRole('RESIDENT'), validate(verifyPaymentSchema), asyncHandler(async (req, res) => {
  const result = await billingService.verifyPayment(req.tenant, req.body);
  res.status(200).json({ success: true, data: result });
}));

module.exports = router;
