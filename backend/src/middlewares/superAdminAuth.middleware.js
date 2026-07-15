const jwt = require('jsonwebtoken');
const { verifyAccessToken } = require('../modules/platform-core/auth/token.service');
const { UnauthorizedError, ForbiddenError } = require('../errors');

// Mirrors auth.middleware.js but WITHOUT the tenant-match check, because
// super-admin routes are mounted before the tenant resolver entirely
// (Phase 7 app.js) -- there is no req.tenant to compare against. Instead,
// this enforces the inverse: the token must have NO tenantId and must
// carry the SUPER_ADMIN role. A tenant admin's token, even if somehow
// presented here, is rejected on both counts.
function superAdminAuthMiddleware(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw new UnauthorizedError('Missing Authorization header');

    const token = header.slice('Bearer '.length);
    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch (err) {
      throw new UnauthorizedError(err instanceof jwt.TokenExpiredError ? 'Token expired' : 'Invalid token');
    }

    if (payload.role !== 'SUPER_ADMIN' || payload.tenantId !== null) {
      throw new ForbiddenError('Super admin access required');
    }

    req.user = { id: payload.sub, tenantId: null, role: 'SUPER_ADMIN' };
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = superAdminAuthMiddleware;
