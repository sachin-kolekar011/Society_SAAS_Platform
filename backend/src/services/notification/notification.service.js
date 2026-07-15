const emailAdapter = require('../email/nodemailerAdapter');
const { statusChangedTemplate, importantNoticeTemplate } = require('../email/templates');

// Thin orchestration layer between domain services (complaint.service.js,
// notice.service.js) and the email adapter. Domain services call these
// named methods -- they never touch nodemailer or template functions
// directly, which keeps "what triggers an email" readable in one place.

async function notifyComplaintStatusChanged({ resident, complaint, fromStatus, toStatus, note }) {
  const html = statusChangedTemplate({
    residentName: resident.user.firstName,
    complaintDescription: complaint.description.slice(0, 80),
    fromStatus,
    toStatus,
    note,
  });
  await emailAdapter.send(resident.user.email, 'Your complaint status has changed', html);
}

async function notifyImportantNotice(residents, notice) {
  // Fire sequentially with a small concurrency cap rather than
  // Promise.all-ing every resident at once -- a society with 300 flats
  // shouldn't open 300 simultaneous SMTP connections on a free-tier box.
  const BATCH_SIZE = 10;
  for (let i = 0; i < residents.length; i += BATCH_SIZE) {
    const batch = residents.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map((resident) => {
        const html = importantNoticeTemplate({
          residentName: resident.user.firstName,
          title: notice.title,
          body: notice.body,
        });
        return emailAdapter.send(resident.user.email, `Important notice: ${notice.title}`, html);
      })
    );
  }
}

module.exports = { notifyComplaintStatusChanged, notifyImportantNotice };
