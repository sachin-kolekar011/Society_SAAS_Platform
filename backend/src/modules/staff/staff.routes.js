const express = require('express');
const bcrypt = require('bcrypt');
const { z } = require('zod');
const prisma = require('../../config/database');
const env = require('../../config/env');
const asyncHandler = require('../../utils/asyncHandler');
const authMiddleware = require('../../middlewares/auth.middleware');
const requireRole = require('../../middlewares/rbac.middleware');
const validate = require('../../middlewares/validate.middleware');
const { ConflictError } = require('../../errors');

// This module exists to close a real gap: WATCHMAN and MAINTENANCE_STAFF
// have been valid roles in the schema since Phase 4, gated correctly on
// every route that matters (gate scan, SOS alerts), but there was never
// any way to actually CREATE an account with either role -- only ADMIN
// (via super-admin tenant creation) and RESIDENT (via public registration)
// had a creation path. Found while auditing "does every role's flow
// actually work end to end," not during original design.

const router = express.Router();
router.use(authMiddleware, requireRole('ADMIN')); // only a society's own admin manages its staff

const createStaffSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    phone: z.string().optional(),
    role: z.enum(['WATCHMAN', 'MAINTENANCE_STAFF']), // deliberately NOT admin/resident -- those have their own dedicated creation paths already
  }),
});

router.post('/', validate(createStaffSchema), asyncHandler(async (req, res) => {
  const { email, password, firstName, lastName, phone, role } = req.body;

  const existing = await prisma.user.findFirst({
    where: { tenantId: req.tenant.id, email, deletedAt: null },
  });
  if (existing) throw new ConflictError('An account with this email already exists in this society');

  const passwordHash = await bcrypt.hash(password, env.bcryptSaltRounds);

  // No Resident record -- staff aren't tied to a flat, unlike residents.
  const user = await prisma.user.create({
    data: { tenantId: req.tenant.id, email, passwordHash, firstName, lastName, phone, role },
  });

  const { passwordHash: _omit, ...safeUser } = user;
  res.status(201).json({ success: true, data: safeUser });
}));

router.get('/', asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const where = { tenantId: req.tenant.id, role: { in: ['WATCHMAN', 'MAINTENANCE_STAFF'] }, deletedAt: null };

  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: { id: true, email: true, firstName: true, lastName: true, phone: true, role: true, isActive: true },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({ where }),
  ]);

  res.status(200).json({ success: true, data: rows, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
}));

router.patch('/:id/status', validate(z.object({ body: z.object({ isActive: z.boolean() }) })), asyncHandler(async (req, res) => {
  const result = await prisma.user.updateMany({
    where: { id: req.params.id, tenantId: req.tenant.id, role: { in: ['WATCHMAN', 'MAINTENANCE_STAFF'] }, deletedAt: null },
    data: { isActive: req.body.isActive },
  });
  res.status(200).json({ success: true, data: { updated: result.count > 0 } });
}));

module.exports = router;