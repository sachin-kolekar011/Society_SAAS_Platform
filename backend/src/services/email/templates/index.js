// Plain functions returning HTML strings -- no templating engine needed
// for two short emails. Kept separate from the adapter so swapping SMTP
// for SES later (Phase 12, AWS-native) doesn't touch template content.

function statusChangedTemplate({ residentName, complaintDescription, fromStatus, toStatus, note }) {
  return `
    <div style="font-family: sans-serif; max-width: 480px;">
      <p>Hi ${residentName},</p>
      <p>Your complaint "<strong>${complaintDescription}</strong>" changed status:</p>
      <p style="font-size: 15px;">${fromStatus ? `${fromStatus} → ` : ''}<strong>${toStatus}</strong></p>
      ${note ? `<p style="color:#555;">Note from admin: ${note}</p>` : ''}
      <p>Log in to your society portal to view the full history.</p>
    </div>
  `;
}

function importantNoticeTemplate({ residentName, title, body }) {
  return `
    <div style="font-family: sans-serif; max-width: 480px;">
      <p>Hi ${residentName},</p>
      <p style="font-size: 15px; font-weight: bold;">📌 ${title}</p>
      <p>${body}</p>
      <p>This notice has been pinned to your society's notice board.</p>
    </div>
  `;
}

module.exports = { statusChangedTemplate, importantNoticeTemplate };
