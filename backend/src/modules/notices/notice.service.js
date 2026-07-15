const noticeRepository = require('./notice.repository');
const notificationService = require('../../services/notification/notification.service');
const { NotFoundError } = require('../../errors');

async function listNotices(tenantId, query) {
  return noticeRepository.findMany(tenantId, query);
}

async function postNotice(tenant, actorUser, input) {
  const notice = await noticeRepository.create(tenant.id, input, actorUser.id);

  if (notice.isImportant) {
    // Fire-and-forget, same reasoning as complaint status emails -- a
    // notice is already posted and visible on the board; email delivery
    // failing shouldn't make the API call itself fail.
    const residents = await noticeRepository.findActiveResidentsWithUsers(tenant.id);
    notificationService.notifyImportantNotice(residents, notice).catch(() => {});
  }

  return notice;
}

async function updateNotice(tenantId, noticeId, input) {
  const found = await noticeRepository.update(tenantId, noticeId, input);
  if (!found) throw new NotFoundError('Notice not found');
}

async function deleteNotice(tenantId, noticeId) {
  const found = await noticeRepository.softDelete(tenantId, noticeId);
  if (!found) throw new NotFoundError('Notice not found');
}

module.exports = { listNotices, postNotice, updateNotice, deleteNotice };
