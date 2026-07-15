const express = require('express');
const asyncHandler = require('../../utils/asyncHandler');
const gateService = require('./gate.service');
const authMiddleware = require('../../middlewares/auth.middleware');
const requireRole = require('../../middlewares/rbac.middleware');
const validate = require('../../middlewares/validate.middleware');
const { createPassSchema, listPassesSchema, qrTokenSchema } = require('./gate.validator');

const router = express.Router();
router.use(authMiddleware);

router.post('/passes', requireRole('RESIDENT'), validate(createPassSchema), asyncHandler(async (req, res) => {
  const pass = await gateService.createPass(req.tenant, req.user, req.body);
  res.status(201).json({ success: true, data: pass });
}));

// RESIDENT sees own, ADMIN/WATCHMAN see all -- scoping happens in the
// service layer the same way complaint.service.js does it (Phase 9), but
// still gated here to the three roles that have any business on this
// endpoint at all.
router.get('/passes', requireRole('RESIDENT', 'ADMIN', 'WATCHMAN'), validate(listPassesSchema), asyncHandler(async (req, res) => {
  const { rows, total } = await gateService.listPasses(req.tenant, req.user, req.query);
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  res.status(200).json({ success: true, data: rows, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
}));

router.delete('/passes/:id', requireRole('RESIDENT'), asyncHandler(async (req, res) => {
  await gateService.cancelPass(req.tenant, req.user, req.params.id);
  res.status(204).send();
}));

// The two endpoints a watchman actually uses at the gate -- deliberately
// tiny payloads (just the scanned token), since this needs to be fast on
// a phone screen, not a full form.
router.post('/check-in', requireRole('WATCHMAN', 'ADMIN'), validate(qrTokenSchema), asyncHandler(async (req, res) => {
  const pass = await gateService.checkIn(req.tenant, req.user, req.body.qrToken);
  res.status(200).json({ success: true, data: pass });
}));

router.post('/check-out', requireRole('WATCHMAN', 'ADMIN'), validate(qrTokenSchema), asyncHandler(async (req, res) => {
  const pass = await gateService.checkOut(req.tenant, req.body.qrToken);
  res.status(200).json({ success: true, data: pass });
}));

module.exports = router;
