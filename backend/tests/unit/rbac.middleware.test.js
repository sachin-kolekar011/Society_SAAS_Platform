const { test } = require('node:test');
const assert = require('node:assert');
const requireRole = require('../../src/middlewares/rbac.middleware');
const { ForbiddenError } = require('../../src/errors');

function mockReqRes(role) {
  const req = { user: role ? { id: 'u1', role } : null };
  const res = {};
  let calledWith;
  const next = (err) => { calledWith = err; };
  return { req, res, next: (err) => { calledWith = err; }, getCalledWith: () => calledWith };
}

test('allows a role that is in the allow-list', () => {
  const { req, res, next } = mockReqRes('ADMIN');
  let nextArg = 'NOT_CALLED';
  requireRole('ADMIN', 'RESIDENT')(req, res, (err) => { nextArg = err; });
  assert.strictEqual(nextArg, undefined, 'next() should be called with no error');
});

test('rejects a role not in the allow-list with ForbiddenError', () => {
  const { req, res } = mockReqRes('WATCHMAN');
  let nextArg;
  requireRole('ADMIN', 'RESIDENT')(req, res, (err) => { nextArg = err; });
  assert.ok(nextArg instanceof ForbiddenError, 'expected a ForbiddenError to be passed to next()');
});

test('rejects when req.user is missing entirely (auth middleware did not run)', () => {
  const { req, res } = mockReqRes(null);
  let nextArg;
  requireRole('ADMIN')(req, res, (err) => { nextArg = err; });
  assert.ok(nextArg instanceof ForbiddenError);
});

test('supports single-role gates (e.g. flats module: ADMIN only)', () => {
  const { req, res } = mockReqRes('RESIDENT');
  let nextArg;
  requireRole('ADMIN')(req, res, (err) => { nextArg = err; });
  assert.ok(nextArg instanceof ForbiddenError, 'RESIDENT must not pass an ADMIN-only gate');
});

test('regression check: the complaint list/detail RBAC fix from the audit actually blocks WATCHMAN', () => {
  // This is the exact bug found during the earlier audit: GET /complaints
  // had no role gate, letting WATCHMAN/MAINTENANCE_STAFF fall into the
  // service's "not RESIDENT, so admin-like" branch. Confirming the fix
  // (requireRole('ADMIN','RESIDENT')) actually rejects WATCHMAN now.
  const { req, res } = mockReqRes('WATCHMAN');
  let nextArg;
  requireRole('ADMIN', 'RESIDENT')(req, res, (err) => { nextArg = err; });
  assert.ok(nextArg instanceof ForbiddenError, 'WATCHMAN must be rejected from the complaints list route');
});
