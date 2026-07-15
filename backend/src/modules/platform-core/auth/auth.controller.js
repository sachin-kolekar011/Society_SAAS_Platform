const authService = require('./auth.service');
const prisma = require('../../../config/database');
const asyncHandler = require('../../../utils/asyncHandler');
const env = require('../../../config/env');

// Cookie options shared by every endpoint that sets/clears the refresh
// cookie -- defined once so login, refresh, and logout can't drift apart.
const REFRESH_COOKIE_NAME = 'refreshToken';
const refreshCookieOptions = {
  httpOnly: true,
  secure: env.cookie.secure,
  sameSite: env.cookie.sameSite,
  path: '/api/v1/auth', // scoped narrowly -- only sent to auth endpoints
};

const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.tenant.id, req.body);
  res.status(201).json({ success: true, data: result });
});

// Added while building the frontend (Phase 10): silent refresh-on-load
// returns a new access token but not a user object -- this endpoint lets
// AuthContext fetch "who am I" right after, using the token it just got.
// Small, obviously-needed addition rather than a gap left for later.
const me = asyncHandler(async (req, res) => {
  const user = await prisma.user.findFirst({
    where: { id: req.user.id, deletedAt: null },
    select: { id: true, email: true, firstName: true, lastName: true, role: true, tenantId: true },
  });
  res.status(200).json({ success: true, data: user });
});

const login = asyncHandler(async (req, res) => {
  // Super admin login is a separate, tenant-less path: hitting /auth/login
  // on a tenant subdomain always logs into THAT tenant; super admins log
  // in via a route that never goes through the tenant resolver at all
  // (see app.js routing note in Phase 6, section 3).
  const { accessToken, refreshToken, user } = await authService.login(req.tenant, req.body);

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    ...refreshCookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000, // matches REFRESH_TOKEN_EXPIRES_IN=7d
  });

  res.status(200).json({ success: true, data: { accessToken, user } });
});

const refresh = asyncHandler(async (req, res) => {
  const rawRefreshToken = req.cookies[REFRESH_COOKIE_NAME];
  const { accessToken, refreshToken } = await authService.refresh(rawRefreshToken);

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    ...refreshCookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.status(200).json({ success: true, data: { accessToken } });
});

const logout = asyncHandler(async (req, res) => {
  const rawRefreshToken = req.cookies[REFRESH_COOKIE_NAME];
  await authService.logout(rawRefreshToken);
  res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions);
  res.status(204).send();
});

const flatsLookup = asyncHandler(async (req, res) => {
  const { search } = req.query;

  const flats = await prisma.flat.findMany({
    where: {
      tenantId: req.tenant.id,
      deletedAt: null,
      ...(search && {
        OR: [
          { flatNumber: { contains: search } },
          { block: { contains: search } },
        ],
      }),
    },
    select: { id: true, flatNumber: true, block: true }, // minimal fields only
    take: 20,
  });

  res.status(200).json({ success: true, data: flats });
});

module.exports = { register, login, refresh, logout, flatsLookup, me };
