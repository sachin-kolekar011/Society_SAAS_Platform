const express = require('express');
const { z } = require('zod');
const bcrypt = require('bcrypt');
const prisma = require('../../config/database');
const env = require('../../config/env');
const asyncHandler = require('../../utils/asyncHandler');
const validate = require('../../middlewares/validate.middleware');
const superAdminAuthMiddleware = require('../../middlewares/superAdminAuth.middleware');
const authService = require('../platform-core/auth/auth.service');
const { ConflictError, NotFoundError } = require('../../errors');

const router = express.Router();

// Default categories seeded for every new tenant -- Phase 4's rationale:
// tenant-scoped categories mean each society can customize later without a
// code deploy, but they shouldn't start from zero.
const DEFAULT_CATEGORIES = ['Plumbing', 'Electrical', 'Cleaning', 'Security', 'Lift/Elevator', 'Other'];

// Mounted BEFORE tenantResolverMiddleware in app.js -- this login is
// tenant-less by design, unlike /api/v1/auth/login which always resolves
// against whichever subdomain the request hit.
router.post('/auth/login', validate(z.object({ body: z.object({ email: z.string().email(), password: z.string() }) })), asyncHandler(async (req, res) => {
  const { accessToken, refreshToken, user } = await authService.login(null, req.body);
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true, secure: env.cookie.secure, sameSite: env.cookie.sameSite, path: '/api/v1/super-admin',
  });
  res.status(200).json({ success: true, data: { accessToken, user } });
}));

router.use(superAdminAuthMiddleware);

const createTenantSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    slug: z.string().min(2).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
    addressLine: z.string().optional(),
    city: z.string().optional(),
    adminEmail: z.string().email(),
    adminPassword: z.string().min(8),
  }),
});

router.post('/tenants', validate(createTenantSchema), asyncHandler(async (req, res) => {
  const { name, slug, addressLine, city, adminEmail, adminPassword } = req.body;

  const existing = await prisma.tenant.findUnique({ where: { slug } });
  if (existing) throw new ConflictError('This subdomain slug is already taken');

  // Tenant + first admin user + default categories, all or nothing --
  // a tenant that exists without a login-capable admin is unusable and
  // has to be manually fixed, which a transaction avoids entirely.
  const result = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({ data: { name, slug, addressLine, city } });

    const passwordHash = await bcrypt.hash(adminPassword, env.bcryptSaltRounds);
    const admin = await tx.user.create({
      data: { tenantId: tenant.id, email: adminEmail, passwordHash, firstName: 'Admin', lastName: name, role: 'ADMIN' },
    });

    await tx.complaintCategory.createMany({
      data: DEFAULT_CATEGORIES.map((categoryName) => ({ tenantId: tenant.id, name: categoryName })),
    });

    return { tenant, admin };
  });

  res.status(201).json({ success: true, data: { tenant: result.tenant, adminUserId: result.admin.id } });
}));

router.get('/tenants', asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const where = { deletedAt: null, ...(req.query.search && { name: { contains: req.query.search } }) };

  const [rows, total] = await Promise.all([
    prisma.tenant.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
    prisma.tenant.count({ where }),
  ]);
  res.status(200).json({ success: true, data: rows, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
}));

router.get('/tenants/:id', asyncHandler(async (req, res) => {
  const tenant = await prisma.tenant.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!tenant) throw new NotFoundError('Tenant not found');
  res.status(200).json({ success: true, data: tenant });
}));

router.patch('/tenants/:id/status', validate(z.object({ body: z.object({ isActive: z.boolean() }) })), asyncHandler(async (req, res) => {
  const result = await prisma.tenant.updateMany({
    where: { id: req.params.id, deletedAt: null },
    data: { isActive: req.body.isActive },
  });
  if (result.count === 0) throw new NotFoundError('Tenant not found');
  res.status(200).json({ success: true });
}));

module.exports = router;
