const nodemailer = require('nodemailer');
const env = require('../../config/env');
const logger = require('../../config/logger');

const transporter = nodemailer.createTransport({
  host: env.smtp.host,
  port: env.smtp.port,
  secure: env.smtp.port === 465,
  auth: { user: env.smtp.user, pass: env.smtp.pass },
});

// send(to, subject, html) -> Promise<void>
// Deliberately swallows failures rather than throwing -- a resident's
// status-change email failing to send should never roll back or fail the
// status update itself (the DB transaction already committed). Logged as
// a warning so it's visible without blocking the actual state change the
// user cares about.
async function send(to, subject, html) {
  try {
    await transporter.sendMail({
      from: `"${env.appName}" <${env.smtp.user}>`,
      to,
      subject,
      html,
    });
  } catch (err) {
    logger.warn('Email send failed', { to, subject, error: err.message });
  }
}

module.exports = { send };
