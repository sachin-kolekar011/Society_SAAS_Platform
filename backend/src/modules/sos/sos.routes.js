const express = require('express');
const prisma = require('../../config/database');
const asyncHandler = require('../../utils/asyncHandler');
const authMiddleware = require('../../middlewares/auth.middleware');
const requireRole = require('../../middlewares/rbac.middleware');
const { NotFoundError, UnprocessableError } = require('../../errors');
const emailAdapter = require('../../services/email/nodemailerAdapter');

const router = express.Router();
router.use(authMiddleware);

// Deliberately no validate/Zod ceremony on the trigger endpoint -- it
// takes no body at all. An SOS button should be the single fastest,
// least-can-go-wrong request in the entire API: one tap, one POST, no
// form fields to fill in under stress.
router.post('/', requireRole('RESIDENT'), asyncHandler(async (req, res) => {
  const resident = await prisma.resident.findFirst({
    where: { userId: req.user.id, tenantId: req.tenant.id, deletedAt: null },
    include: { user: true, flat: true },
  });
  if (!resident) throw new NotFoundError('Resident profile not found');

  const alert = await prisma.sosAlert.create({
    data: { tenantId: req.tenant.id, residentId: resident.id },
  });

  // Notify every admin AND every watchman -- an emergency shouldn't
  // depend on one specific person being online. Fire-and-forget per the
  // established notification pattern (Phase 9): the alert has already
  // been recorded, email delivery failing must never mask that.
  const responders = await prisma.user.findMany({
    where: { tenantId: req.tenant.id, role: { in: ['ADMIN', 'WATCHMAN'] }, isActive: true, deletedAt: null },
  });
  const flatLabel = `${resident.flat.block ? resident.flat.block + '-' : ''}${resident.flat.flatNumber}`;
  responders.forEach((responder) => {
    emailAdapter
      .send(
        responder.email,
        `🚨 SOS alert from ${flatLabel}`,
        `<p><strong>${resident.user.firstName} ${resident.user.lastName}</strong> (Flat ${flatLabel}) triggered an emergency alert.</p>
         <p>Time: ${alert.triggeredAt.toLocaleString()}</p>
         <p>Please acknowledge and respond via the society portal.</p>`
      )
      .catch(() => {}); // adapter already logs internally
  });

  res.status(201).json({ success: true, data: alert });
}));

router.get('/', requireRole('ADMIN', 'WATCHMAN'), asyncHandler(async (req, res) => {
  const alerts = await prisma.sosAlert.findMany({
    where: { tenantId: req.tenant.id },
    include: { resident: { include: { user: true, flat: true } } },
    orderBy: { triggeredAt: 'desc' },
  });

  // Explicit priority sort, not a plain enum orderBy -- alphabetically
  // ACKNOWLEDGED sorts before ACTIVE, which would bury the most urgent
  // alerts under already-handled ones. Same lesson as the complaint
  // overdue-sort bug: never trust an enum's alphabetical order to match
  // its real-world urgency order.
  const STATUS_PRIORITY = { ACTIVE: 0, ACKNOWLEDGED: 1, RESOLVED: 2 };
  alerts.sort((a, b) => STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status]);

  res.status(200).json({ success: true, data: alerts });
}));

router.patch('/:id/acknowledge', requireRole('ADMIN', 'WATCHMAN'), asyncHandler(async (req, res) => {
  const result = await prisma.sosAlert.updateMany({
    where: { id: req.params.id, tenantId: req.tenant.id, status: 'ACTIVE' },
    data: { status: 'ACKNOWLEDGED', acknowledgedByUserId: req.user.id, acknowledgedAt: new Date() },
  });
  if (result.count === 0) throw new UnprocessableError('Alert not found or already handled');
  res.status(200).json({ success: true });
}));

router.patch('/:id/resolve', requireRole('ADMIN', 'WATCHMAN'), asyncHandler(async (req, res) => {
  const result = await prisma.sosAlert.updateMany({
    where: { id: req.params.id, tenantId: req.tenant.id, status: { in: ['ACTIVE', 'ACKNOWLEDGED'] } },
    data: { status: 'RESOLVED', resolvedAt: new Date(), notes: req.body?.notes },
  });
  if (result.count === 0) throw new UnprocessableError('Alert not found or already resolved');
  res.status(200).json({ success: true });
}));

module.exports = router;
