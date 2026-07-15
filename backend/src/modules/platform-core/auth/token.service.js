const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const env = require('../../../config/env');
const prisma = require('../../../config/database');

// ── Access tokens ────────────────────────────────────────────────────────
// Short-lived (15m default), signed, carries the claims the auth+RBAC
// middlewares check on every request. Never stored server-side -- it's
// stateless by design, which is *why* it must be short-lived: there's no
// way to revoke one early except waiting it out or rotating the secret.

function signAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      tenantId: user.tenantId, // null for SUPER_ADMIN
      role: user.role,
    },
    env.jwt.accessSecret,
    { expiresIn: env.jwt.accessExpiresIn }
  );
}

function verifyAccessToken(token) {
  // Throws JsonWebTokenError / TokenExpiredError on failure -- caller
  // (auth.middleware.js) is responsible for translating that into a 401.
  return jwt.verify(token, env.jwt.accessSecret);
}

// ── Refresh tokens ───────────────────────────────────────────────────────
// Longer-lived (7d default), but the token itself is NOT what's trusted --
// only its SHA-256 hash, stored in the RefreshToken table, is. This is
// what makes rotation and revocation real:
//   - logout()      -> revokedAt is set, token is dead immediately
//   - refresh()     -> old row revoked, new row issued (rotation)
//   - stolen token  -> if the thief refreshes first, the legitimate user's
//                      next refresh attempt fails because the hash no
//                      longer matches an unrevoked row -- detectable reuse.

function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

async function issueRefreshToken(user, tenantId) {
  const rawToken = crypto.randomBytes(40).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + parseExpiryToMs(env.jwt.refreshExpiresIn));

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tenantId: tenantId ?? null,
      tokenHash,
      expiresAt,
    },
  });

  return rawToken; // this raw value goes in the httpOnly cookie, never the hash
}

async function rotateRefreshToken(rawToken) {
  const tokenHash = hashToken(rawToken);

  const existing = await prisma.refreshToken.findFirst({
    where: { tokenHash, revokedAt: null, expiresAt: { gt: new Date() } },
    include: { user: true },
  });

  if (!existing) {
    return null; // caller treats this as "refresh failed, force re-login"
  }

  // Revoke the old token FIRST, then issue a new one -- if the process
  // crashes between these two steps, we fail closed (user has to log in
  // again) rather than fail open (old token stays valid forever).
  await prisma.refreshToken.update({
    where: { id: existing.id },
    data: { revokedAt: new Date() },
  });

  const newRawToken = await issueRefreshToken(existing.user, existing.tenantId);

  return { user: existing.user, rawToken: newRawToken };
}

async function revokeRefreshToken(rawToken) {
  const tokenHash = hashToken(rawToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

function parseExpiryToMs(expiry) {
  // Minimal "7d" / "15m" / "3600s" parser -- avoids pulling in a whole
  // library just for this one conversion.
  const match = /^(\d+)([smhd])$/.exec(expiry);
  if (!match) throw new Error(`Invalid expiry format: ${expiry}`);
  const [, amount, unit] = match;
  const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return parseInt(amount, 10) * multipliers[unit];
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
};
