const bcrypt = require('bcrypt');
const env = require('../../../config/env');
const authRepository = require('./auth.repository');
const tokenService = require('./token.service');
const { ConflictError, UnauthorizedError, NotFoundError } = require('../../../errors');

async function register(tenantId, input) {
  const existing = await authRepository.findUserByEmailInTenant(tenantId, input.email);
  if (existing) {
    // Deliberately generic message -- doesn't confirm to an attacker
    // whether it was the email specifically that collided.
    throw new ConflictError('An account with these details already exists');
  }

  // Phase 6 update: flats are admin-managed only. Registration validates
  // against an existing flat rather than creating one.
  const flat = await authRepository.findFlatById(tenantId, input.flatId);
  if (!flat) {
    throw new NotFoundError('Selected flat was not found. Please contact your society admin.');
  }

  const passwordHash = await bcrypt.hash(input.password, env.bcryptSaltRounds);

  const { user, resident } = await authRepository.createResidentUser(tenantId, {
    email: input.email,
    passwordHash,
    firstName: input.firstName,
    lastName: input.lastName,
    phone: input.phone,
    flatId: input.flatId,
    residentType: input.residentType,
  });

  return { user: toSafeUser(user), resident };
}

async function login(tenant, { email, password }) {
  // tenant may be null when this is called from the super-admin login path
  // (see auth.controller.js) -- findSuperAdminByEmail handles that branch.
  const user = tenant
    ? await authRepository.findUserByEmailInTenant(tenant.id, email)
    : await authRepository.findSuperAdminByEmail(email);

  // Same error for "no such user" and "wrong password" -- don't leak which
  // one it was, that's a user-enumeration vector.
  const invalidCredentials = () => new UnauthorizedError('Invalid email or password');

  if (!user || !user.isActive) throw invalidCredentials();

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) throw invalidCredentials();

  const accessToken = tokenService.signAccessToken(user);
  const refreshToken = await tokenService.issueRefreshToken(user, user.tenantId);

  return { accessToken, refreshToken, user: toSafeUser(user) };
}

async function refresh(rawRefreshToken) {
  const result = await tokenService.rotateRefreshToken(rawRefreshToken);
  if (!result) {
    throw new UnauthorizedError('Session expired, please log in again');
  }

  const accessToken = tokenService.signAccessToken(result.user);
  return { accessToken, refreshToken: result.rawToken };
}

async function logout(rawRefreshToken) {
  if (rawRefreshToken) {
    await tokenService.revokeRefreshToken(rawRefreshToken);
  }
}

// Never return passwordHash to a client, ever -- this is the DTO pattern
// (Phase 2) applied at its smallest scale.
function toSafeUser(user) {
  const { passwordHash, ...safe } = user;
  return safe;
}

module.exports = { register, login, refresh, logout };
