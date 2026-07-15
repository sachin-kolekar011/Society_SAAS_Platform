const express = require('express');
const asyncHandler = require('../../utils/asyncHandler');
const noticeService = require('./notice.service');
const authMiddleware = require('../../middlewares/auth.middleware');
const requireRole = require('../../middlewares/rbac.middleware');
const validate = require('../../middlewares/validate.middleware');
const { listNoticesSchema, createNoticeSchema, updateNoticeSchema } = require('./notice.validator');

const router = express.Router();
router.use(authMiddleware);

router.get('/', validate(listNoticesSchema), asyncHandler(async (req, res) => {
  const { rows, total } = await noticeService.listNotices(req.tenant.id, req.query);
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  res.status(200).json({ success: true, data: rows, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
}));

router.post('/', requireRole('ADMIN'), validate(createNoticeSchema), asyncHandler(async (req, res) => {
  const notice = await noticeService.postNotice(req.tenant, req.user, req.body);
  res.status(201).json({ success: true, data: notice });
}));

router.patch('/:id', requireRole('ADMIN'), validate(updateNoticeSchema), asyncHandler(async (req, res) => {
  await noticeService.updateNotice(req.tenant.id, req.params.id, req.body);
  res.status(200).json({ success: true });
}));

router.delete('/:id', requireRole('ADMIN'), asyncHandler(async (req, res) => {
  await noticeService.deleteNotice(req.tenant.id, req.params.id);
  res.status(204).send();
}));

module.exports = router;
