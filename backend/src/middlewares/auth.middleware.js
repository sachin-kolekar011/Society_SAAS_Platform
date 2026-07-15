const jwt = require('jsonwebtoken');
const { verifyAccessToken } = require('../modules/platform-core/auth/token.service');
const { UnauthorizedError, ForbiddenError } = require('../errors');

// Runs AFTER tenantResolverMiddleware. req.tenant is already set.
//
// The critical check here is line marked (*) below: the token's tenantId
// claim must match the ALREADY-RESOLVED tenant from the subdomain. Without
// this check, a valid access token issued for greenvalley could be replayed
// against skyheights's subdomain and -- if RBAC alone were trusted -- an
// ADMIN token from one society would pass an ADMIN check on a completely
// different society. This single comparison is the actual enforcement
// point for "no cross-tenant data access," not a hope that every query
// downstream remembers to filter correctly.
function authMiddleware(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or malformed Authorization header');
    }

    const token = header.slice('Bearer '.length);

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Access token expired');
      }
      throw new UnauthorizedError('Invalid access token');
    }

    // (*) tenant match check
    if (payload.tenantId !== req.tenant.id) {
      throw new ForbiddenError('Token does not belong to this tenant');
    }

    req.user = {
      id: payload.sub,
      tenantId: payload.tenantId,
      role: payload.role,
    };

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = authMiddleware;
