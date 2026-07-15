const complaintService = require('./complaint.service');
const asyncHandler = require('../../utils/asyncHandler');

const getCategories = asyncHandler(async (req, res) => {
  const categories = await complaintService.getCategories(req.tenant.id);
  res.status(200).json({ success: true, data: categories });
});

const suggest = asyncHandler(async (req, res) => {
  const suggestion = await complaintService.suggestTriage(req.tenant.id, req.body.description);
  res.status(200).json({ success: true, data: suggestion });
});

const create = asyncHandler(async (req, res) => {
  const complaint = await complaintService.raiseComplaint(req.tenant, req.user, req.body, req.file);
  res.status(201).json({ success: true, data: complaint });
});

const list = asyncHandler(async (req, res) => {
  const { rows, total } = await complaintService.listComplaints(req.tenant, req.user, req.query);
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  res.status(200).json({
    success: true,
    data: rows,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

const getById = asyncHandler(async (req, res) => {
  const complaint = await complaintService.getComplaintById(req.tenant, req.user, req.params.id);
  res.status(200).json({ success: true, data: complaint });
});

const updateStatus = asyncHandler(async (req, res) => {
  const updated = await complaintService.changeStatus(req.tenant, req.user, req.params.id, req.body);
  res.status(200).json({ success: true, data: updated });
});

const updatePriority = asyncHandler(async (req, res) => {
  await complaintService.changePriority(req.tenant, req.params.id, req.body.priority);
  res.status(200).json({ success: true });
});

module.exports = { getCategories, suggest, create, list, getById, updateStatus, updatePriority };
