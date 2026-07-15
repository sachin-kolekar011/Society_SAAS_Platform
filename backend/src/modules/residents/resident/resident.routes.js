const express = require('express');
const prisma = require('../../../config/database');
const asyncHandler = require('../../../utils/asyncHandler');
const authMiddleware = require('../../../middlewares/auth.middleware');
const requireRole = require('../../../middlewares/rbac.middleware');
const { NotFoundError } = require('../../../errors');

const router = express.Router();
router.use(authMiddleware);

router.get('/', requireRole('ADMIN'), asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const where = { tenantId: req.tenant.id, deletedAt: null, ...(req.query.flatId && { flatId: req.query.flatId }) };

  const [rows, total] = await Promise.all([
    prisma.resident.findMany({
      where, skip: (page - 1) * limit, take: limit,
      include: { user: { select: { firstName: true, lastName: true, email: true, phone: true } }, flat: true },
    }),
    prisma.resident.count({ where }),
  ]);
  res.status(200).json({ success: true, data: rows, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
}));

router.get('/me', requireRole('RESIDENT'), asyncHandler(async (req, res) => {
  const resident = await prisma.resident.findFirst({
    where: { userId: req.user.id, tenantId: req.tenant.id, deletedAt: null },
    include: { user: { select: { firstName: true, lastName: true, email: true, phone: true } }, flat: true },
  });
  if (!resident) throw new NotFoundError('Resident profile not found');
  res.status(200).json({ success: true, data: resident });
}));

router.patch('/me', requireRole('RESIDENT'), asyncHandler(async (req, res) => {
  // Deliberately narrow: residents can only edit their own phone number in
  // MVP (Phase 6 §4) -- everything else (name, flat, email) is admin-managed
  // to avoid residents accidentally reassigning themselves to another flat.
  await prisma.user.update({
    where: { id: req.user.id },
    data: { phone: req.body.phone },
  });
  res.status(200).json({ success: true });
}));

module.exports = router;
