const { ForbiddenError } = require('../errors');

// Factory, not a single middleware -- each route declares which roles may
// pass: router.get('/dashboard', authMiddleware, requireRole('ADMIN'), ...)
// Runs after authMiddleware, so req.user is guaranteed to exist.
function requireRole(...allowedRoles) {
  return function rbacMiddleware(req, res, next) {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return next(new ForbiddenError('You do not have permission to perform this action'));
    }
    next();
  };
}

module.exports = requireRole;
