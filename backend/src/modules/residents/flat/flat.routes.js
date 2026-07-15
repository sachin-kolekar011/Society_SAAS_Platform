const express = require('express');
const prisma = require('../../../config/database');
const asyncHandler = require('../../../utils/asyncHandler');
const authMiddleware = require('../../../middlewares/auth.middleware');
const requireRole = require('../../../middlewares/rbac.middleware');
const { ConflictError, NotFoundError } = require('../../../errors');

// Small enough module that repository/service/controller live in one file
// rather than four -- KISS over ceremony. Complaints justified the split
// because it has real business logic (transitions, overdue); this doesn't.

const router = express.Router();
router.use(authMiddleware, requireRole('ADMIN')); // flat management is admin-only, full stop

router.get('/', asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const where = { tenantId: req.tenant.id, deletedAt: null, ...(req.query.block && { block: req.query.block }) };

  const [rows, total] = await Promise.all([
    prisma.flat.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: [{ block: 'asc' }, { flatNumber: 'asc' }] }),
    prisma.flat.count({ where }),
  ]);
  res.status(200).json({ success: true, data: rows, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
}));

router.post('/', asyncHandler(async (req, res) => {
  const { flatNumber, block, floor, type } = req.body;
  const existing = await prisma.flat.findFirst({ where: { tenantId: req.tenant.id, flatNumber, block, deletedAt: null } });
  if (existing) throw new ConflictError('A flat with this number and block already exists');

  const flat = await prisma.flat.create({
    data: { tenantId: req.tenant.id, flatNumber, block, floor, type, createdBy: req.user.id },
  });
  res.status(201).json({ success: true, data: flat });
}));

router.patch('/:id', asyncHandler(async (req, res) => {
  const result = await prisma.flat.updateMany({
    where: { id: req.params.id, tenantId: req.tenant.id, deletedAt: null },
    data: { ...req.body, updatedBy: req.user.id },
  });
  if (result.count === 0) throw new NotFoundError('Flat not found');
  res.status(200).json({ success: true });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const result = await prisma.flat.updateMany({
    where: { id: req.params.id, tenantId: req.tenant.id, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  if (result.count === 0) throw new NotFoundError('Flat not found');
  res.status(204).send();
}));

module.exports = router;
