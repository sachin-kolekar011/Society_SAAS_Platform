const complaintRepository = require('./complaint.repository');
const storage = require('../../services/storage');
const notificationService = require('../../services/notification/notification.service');
const triageService = require('../../services/triage');
const { NotFoundError, ForbiddenError, UnprocessableError } = require('../../errors');
const prisma = require('../../config/database');

// Forward-only lifecycle, matching the PDF spec exactly: OPEN -> IN_PROGRESS
// -> RESOLVED, and RESOLVED is terminal ("once resolved, it is closed").
// Expressed as an explicit allow-list rather than a generic "any status can
// go to any status" check -- this is the one rule most likely to be
// evaluated directly, so it should be unambiguous to read, not clever.
const ALLOWED_TRANSITIONS = {
  OPEN: ['IN_PROGRESS', 'RESOLVED'],
  IN_PROGRESS: ['RESOLVED'],
  RESOLVED: [], // terminal
};

async function getCategories(tenantId) {
  return complaintRepository.findCategories(tenantId);
}

// AI-assisted triage: called BEFORE submission, from the raise-complaint
// form, to suggest a category and priority as the resident types. Never
// applied automatically -- the resident still picks (and can override) the
// final category/priority, this is a suggestion surfaced in the UI, not a
// silent auto-classification.
async function suggestTriage(tenantId, description) {
  const categories = await complaintRepository.findCategories(tenantId);
  return triageService.suggest(description, categories);
}

// Resolves the caller's own Resident row from their User id -- used
// anywhere a residentId is needed, so it's NEVER accepted as client input.
// This one function is what stops a resident from raising or reading a
// complaint "as" another flat.
async function getOwnResident(tenant, actorUser) {
  const resident = await prisma.resident.findFirst({
    where: { userId: actorUser.id, tenantId: tenant.id, deletedAt: null },
  });
  if (!resident) throw new NotFoundError('Resident profile not found');
  return resident;
}

async function raiseComplaint(tenant, actorUser, { categoryId, description }, file) {
  const resident = await getOwnResident(tenant, actorUser);

  let photoUrl = null;
  if (file) {
    const uploaded = await storage.upload(file.buffer, { tenantSlug: tenant.slug });
    photoUrl = uploaded.url;
  }

  return complaintRepository.createComplaint(
    tenant.id,
    { residentId: resident.id, categoryId, description, photoUrl },
    actorUser.id
  );
}

async function listComplaints(tenant, actorUser, query) {
  // Resident scoping happens HERE, not trusted from a query param -- a
  // resident can never pass ?residentId=<someone-else> and see another
  // flat's complaints, because this value is derived from the
  // authenticated user, never from req.query.
  let residentId;
  if (actorUser.role === 'RESIDENT') {
    const resident = await getOwnResident(tenant, actorUser);
    residentId = resident.id;
  }

  const { rows, total } = await complaintRepository.findMany(tenant.id, {
    ...query,
    residentId,
    overdueThresholdDays: tenant.overdueThresholdDays,
  });

  return { rows, total };
}

async function getComplaintById(tenant, actorUser, complaintId) {
  const complaint = await complaintRepository.findById(tenant.id, complaintId, tenant.overdueThresholdDays);
  if (!complaint) throw new NotFoundError('Complaint not found');

  if (actorUser.role === 'RESIDENT' && complaint.resident.userId !== actorUser.id) {
    // 404, not 403 -- see Phase 6 §5, don't confirm existence of a
    // complaint the caller shouldn't be able to see at all.
    throw new NotFoundError('Complaint not found');
  }

  return complaint;
}

async function changeStatus(tenant, actorUser, complaintId, { status: toStatus, note }) {
  const current = await complaintRepository.findById(tenant.id, complaintId, tenant.overdueThresholdDays);
  if (!current) throw new NotFoundError('Complaint not found');

  const allowedNextStatuses = ALLOWED_TRANSITIONS[current.status];
  if (!allowedNextStatuses.includes(toStatus)) {
    throw new UnprocessableError(
      current.status === 'RESOLVED'
        ? 'This complaint is resolved and closed. It cannot be reopened.'
        : `Cannot move from ${current.status} to ${toStatus}`
    );
  }

  const updated = await complaintRepository.updateStatus(tenant.id, complaintId, { toStatus, note }, actorUser.id);

  // Notification failure must never fail the request -- the status change
  // already committed. Fire-and-forget, logged internally by the adapter.
  notificationService
    .notifyComplaintStatusChanged({
      resident: updated.resident,
      complaint: current,
      fromStatus: updated.fromStatus,
      toStatus,
      note,
    })
    .catch(() => {}); // adapter already logs; this catch just prevents an unhandled rejection

  return updated;
}

async function changePriority(tenant, complaintId, priority) {
  const found = await complaintRepository.updatePriority(tenant.id, complaintId, priority);
  if (!found) throw new NotFoundError('Complaint not found');
}

module.exports = { getCategories, suggestTriage, raiseComplaint, listComplaints, getComplaintById, changeStatus, changePriority };
