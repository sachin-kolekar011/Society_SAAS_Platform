const express = require('express');
const controller = require('./complaint.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const requireRole = require('../../middlewares/rbac.middleware');
const validate = require('../../middlewares/validate.middleware');
const upload = require('../../middlewares/upload.middleware');
const {
  raiseComplaintSchema,
  listComplaintsSchema,
  changeStatusSchema,
  changePrioritySchema,
  suggestTriageSchema,
} = require('./complaint.validator');

const router = express.Router();

router.use(authMiddleware); // every complaint route requires a logged-in user

router.get('/categories', controller.getCategories);
router.post('/suggest', validate(suggestTriageSchema), controller.suggest);

router.post(
  '/',
  requireRole('RESIDENT'),
  upload.single('photo'),
  validate(raiseComplaintSchema),
  controller.create
);

// Explicitly gated to ADMIN + RESIDENT, not left open to "any authenticated
// role." Found during audit: the service layer's role check is
// `if (role === 'RESIDENT') scope to own else return everything` --
// without this gate, a WATCHMAN or MAINTENANCE_STAFF account (both valid
// logins per the Role enum, Phase 4) would fall into the "everything"
// branch and see every complaint in the tenant, unscoped. RBAC at the
// route is what actually closes that, not an assumption about who calls it.
router.get('/', requireRole('ADMIN', 'RESIDENT'), validate(listComplaintsSchema), controller.list);
router.get('/:id', requireRole('ADMIN', 'RESIDENT'), controller.getById);

router.patch('/:id/status', requireRole('ADMIN'), validate(changeStatusSchema), controller.updateStatus);
router.patch('/:id/priority', requireRole('ADMIN'), validate(changePrioritySchema), controller.updatePriority);

module.exports = router;
