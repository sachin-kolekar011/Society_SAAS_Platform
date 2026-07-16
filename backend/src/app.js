// const express = require('express');
// const helmet = require('helmet');
// const cors = require('cors');
// const cookieParser = require('cookie-parser');
// const rateLimit = require('express-rate-limit');

// const requestIdMiddleware = require('./middlewares/requestId.middleware');
// const tenantResolverMiddleware = require('./middlewares/tenantResolver.middleware');
// const errorHandlerMiddleware = require('./middlewares/errorHandler.middleware');
// const authRoutes = require('./modules/platform-core/auth/auth.routes');
// const tenantRoutes = require('./modules/platform-core/tenant/tenant.routes');
// const superAdminRoutes = require('./modules/super-admin/superAdmin.routes');
// const complaintRoutes = require('./modules/complaints/complaint.routes');
// const noticeRoutes = require('./modules/notices/notice.routes');
// const flatRoutes = require('./modules/residents/flat/flat.routes');
// const residentRoutes = require('./modules/residents/resident/resident.routes');
// const dashboardRoutes = require('./modules/dashboard/dashboard.routes');
// const gateRoutes = require('./modules/gate/gate.routes');
// const sosRoutes = require('./modules/sos/sos.routes');
// const billingRoutes = require('./modules/billing/billing.routes');
// const pollsRoutes = require('./modules/polls/polls.routes');

// const app = express();

// // ── Global, tenant-agnostic middleware ──────────────────────────────────
// app.use(helmet());
// app.use(cors({ credentials: true, origin: true })); // same-origin deploy; origin reflected safely by `credentials: true` + browser's own same-origin cookie rules
// app.use(express.json());
// app.use(cookieParser());
// app.use(requestIdMiddleware);

// app.use(
//   rateLimit({
//     windowMs: 15 * 60 * 1000,
//     max: 300, // generous general limit; auth routes have their own stricter one
//   })
// );

// // ── Super admin routes: deliberately mounted BEFORE the tenant resolver.
// // These are platform-wide, not tenant-scoped -- there is no subdomain to
// // resolve a tenant from when a platform operator is creating tenants.
// app.use('/api/v1/super-admin', superAdminRoutes);

// // ── Everything below this line is tenant-scoped ─────────────────────────
// app.use(tenantResolverMiddleware);

// app.use('/api/v1/auth', authRoutes);
// app.use('/api/v1/tenant', tenantRoutes);
// app.use('/api/v1/complaints', complaintRoutes);
// app.use('/api/v1/notices', noticeRoutes);
// app.use('/api/v1/flats', flatRoutes);
// app.use('/api/v1/residents', residentRoutes);
// app.use('/api/v1/dashboard', dashboardRoutes);
// app.use('/api/v1/gate', gateRoutes);
// app.use('/api/v1/sos', sosRoutes);
// app.use('/api/v1/billing', billingRoutes);
// app.use('/api/v1/polls', pollsRoutes);

// // 404 for anything under /api/v1 that didn't match a mounted router
// app.use('/api/v1', (req, res) => {
//   res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } });
// });

// // Must be registered last -- Express identifies error middleware by arity (4 args)
// app.use(errorHandlerMiddleware);

// module.exports = app;



const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const requestIdMiddleware = require('./middlewares/requestId.middleware');
const tenantResolverMiddleware = require('./middlewares/tenantResolver.middleware');
const errorHandlerMiddleware = require('./middlewares/errorHandler.middleware');
const authRoutes = require('./modules/platform-core/auth/auth.routes');
const tenantRoutes = require('./modules/platform-core/tenant/tenant.routes');
const superAdminRoutes = require('./modules/super-admin/superAdmin.routes');
const complaintRoutes = require('./modules/complaints/complaint.routes');
const noticeRoutes = require('./modules/notices/notice.routes');
const flatRoutes = require('./modules/residents/flat/flat.routes');
const residentRoutes = require('./modules/residents/resident/resident.routes');
const staffRoutes = require('./modules/staff/staff.routes');
const dashboardRoutes = require('./modules/dashboard/dashboard.routes');
const gateRoutes = require('./modules/gate/gate.routes');
const sosRoutes = require('./modules/sos/sos.routes');
const billingRoutes = require('./modules/billing/billing.routes');
const pollsRoutes = require('./modules/polls/polls.routes');

const app = express();

// ── Global, tenant-agnostic middleware ──────────────────────────────────
app.use(helmet());
app.use(cors({ credentials: true, origin: true })); // same-origin deploy; origin reflected safely by `credentials: true` + browser's own same-origin cookie rules
app.use(express.json());
app.use(cookieParser());
app.use(requestIdMiddleware);

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300, // generous general limit; auth routes have their own stricter one
  })
);

// ── Super admin routes: deliberately mounted BEFORE the tenant resolver.
// These are platform-wide, not tenant-scoped -- there is no subdomain to
// resolve a tenant from when a platform operator is creating tenants.
app.use('/api/v1/super-admin', superAdminRoutes);

// ── Everything below this line is tenant-scoped ─────────────────────────
app.use(tenantResolverMiddleware);

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/tenant', tenantRoutes);
app.use('/api/v1/complaints', complaintRoutes);
app.use('/api/v1/notices', noticeRoutes);
app.use('/api/v1/flats', flatRoutes);
app.use('/api/v1/residents', residentRoutes);
app.use('/api/v1/staff', staffRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/gate', gateRoutes);
app.use('/api/v1/sos', sosRoutes);
app.use('/api/v1/billing', billingRoutes);
app.use('/api/v1/polls', pollsRoutes);

// 404 for anything under /api/v1 that didn't match a mounted router
app.use('/api/v1', (req, res) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } });
});

// Must be registered last -- Express identifies error middleware by arity (4 args)
app.use(errorHandlerMiddleware);

module.exports = app;