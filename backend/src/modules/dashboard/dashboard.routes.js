const express = require('express');
const prisma = require('../../config/database');
const asyncHandler = require('../../utils/asyncHandler');
const authMiddleware = require('../../middlewares/auth.middleware');
const requireRole = require('../../middlewares/rbac.middleware');

const router = express.Router();
router.use(authMiddleware, requireRole('ADMIN'));

router.get('/summary', asyncHandler(async (req, res) => {
  const tenantId = req.tenant.id;

  // Every aggregate computed live in this one request -- consistent with
  // Phase 4's "computed, not stored" philosophy applied to overdue status.
  // A dedicated stats table would need to be kept in sync on every
  // complaint write; three grouped queries against live data can't drift.
  const [byStatus, byCategory, allOpenOrInProgress] = await Promise.all([
    prisma.complaint.groupBy({
      by: ['status'],
      where: { tenantId, deletedAt: null },
      _count: true,
    }),
    prisma.complaint.groupBy({
      by: ['categoryId'],
      where: { tenantId, deletedAt: null },
      _count: true,
    }),
    prisma.complaint.findMany({
      where: { tenantId, deletedAt: null, status: { not: 'RESOLVED' } },
      select: { id: true, createdAt: true },
    }),
  ]);

  const overdueCount = allOpenOrInProgress.filter(
    (c) => (Date.now() - new Date(c.createdAt).getTime()) / 86_400_000 > req.tenant.overdueThresholdDays
  ).length;

  const categoryIds = byCategory.map((c) => c.categoryId);
  const categories = await prisma.complaintCategory.findMany({ where: { id: { in: categoryIds } } });
  const categoryNameById = Object.fromEntries(categories.map((c) => [c.id, c.name]));

  const STATUS_KEY_MAP = { OPEN: 'open', IN_PROGRESS: 'inProgress', RESOLVED: 'resolved' };

  res.status(200).json({
    success: true,
    data: {
      totalComplaints: byStatus.reduce((sum, s) => sum + s._count, 0),
      byStatus: {
        open: 0, inProgress: 0, resolved: 0,
        ...Object.fromEntries(byStatus.map((s) => [STATUS_KEY_MAP[s.status], s._count])),
      },
      byCategory: byCategory.map((c) => ({ categoryName: categoryNameById[c.categoryId], count: c._count })),
      overdueCount,
    },
  });
}));

module.exports = router;
