const prisma = require('../config/database');
const { NotFoundError } = require('../errors');

// Extracts the tenant slug from the request's Host header and attaches the
// full tenant row (minus sensitive fields) as req.tenant.
//
// Works for both forms without any branching logic change later:
//   dev/deploy without a domain: greenvalley.<elastic-ip>.nip.io
//   production with a real domain: greenvalley.yourdomain.com
// In both cases the slug is simply the FIRST label of the hostname.
//
// This must run BEFORE auth middleware -- see Phase 2 architecture doc,
// section 1: auth needs to check token.tenantId against the RESOLVED
// tenant, not the other way around.
function extractSlug(hostHeader) {
  if (!hostHeader) return null;
  // Strip port if present (e.g. "greenvalley.localhost:5173")
  const host = hostHeader.split(':')[0];
  const labels = host.split('.');
  // "greenvalley.3-110-25-60.nip.io" -> ["greenvalley","3-110-25-60","nip","io"]
  // "greenvalley.yourdomain.com"     -> ["greenvalley","yourdomain","com"]
  // The slug is always the first label in both shapes.
  if (labels.length < 2) return null; // no subdomain present at all
  return labels[0];
}

async function tenantResolverMiddleware(req, res, next) {
  try {
    const slug = extractSlug(req.headers.host);

    if (!slug) {
      // Deliberately 404, not a more descriptive error -- an unresolvable
      // tenant should look identical to "this URL doesn't exist" to an
      // unauthenticated caller.
      throw new NotFoundError('Not found');
    }

    const tenant = await prisma.tenant.findFirst({
      where: { slug, deletedAt: null, isActive: true },
      select: {
        id: true,
        slug: true,
        name: true,
        logoUrl: true,
        primaryColor: true,
        secondaryColor: true,
        timezone: true,
        overdueThresholdDays: true,
      },
    });

    if (!tenant) {
      throw new NotFoundError('Not found');
    }

    req.tenant = tenant;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = tenantResolverMiddleware;
