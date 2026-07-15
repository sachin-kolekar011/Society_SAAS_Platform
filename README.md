# Society Management SaaS Platform

A multi-tenant platform for apartment/housing societies — complaint tracking with full audit history, visitor gate management with QR passes, SOS emergency alerts, online billing, society polls, and AI-assisted complaint triage. Built React + Node/Express + Prisma + MySQL, deployable to AWS Free Tier via Terraform + Ansible + Docker + GitHub Actions.

**[→ View the project showcase page](./marketing/index.html)** — a marketing-style overview with the full feature list, architecture decisions, and a real audit trail of bugs found and fixed during development.

---

## What this actually is

Most student CRUD projects stop at "it works on my machine." This one was built in 12 explicit phases — requirements and architecture written and reviewed *before* any implementation — and every phase was checked for correctness with real tools, not just re-read: 23 unit tests, a real MariaDB instance actually created and queried, `ansible-lint` at its strictest profile, a real production frontend build. Where that process found real bugs, they're documented, not hidden — see [Known issues found & fixed](#known-issues-found--fixed) below.

---

## Features

| Module | What it does |
|---|---|
| **Complaint management** | Resident raises a complaint (category, description, optional photo) → admin sets priority and updates status through an enforced `Open → In Progress → Resolved` lifecycle → every change recorded with timestamp, actor, and note. Overdue complaints (past a per-society configurable threshold) surface at the top of the admin view. |
| **Notice board** | Admin posts notices; marking one "important" pins it to the top and emails every resident. |
| **Visitor & gate management** | Resident generates a QR pass for an expected visitor; watchman scans it to check in/out at the gate; admin sees a live gate log across the whole society. |
| **SOS emergency alert** | One tap from a resident instantly emails every admin and watchman — no form, by design. |
| **Online maintenance billing** | Admin generates monthly bills per flat; resident pays via real Razorpay checkout, with the payment signature verified server-side before anything is marked paid. |
| **Society polls** | Admin posts a question with 2+ options; residents vote once (enforced at the database level via a unique constraint, not just client-side); live results. |
| **AI-assisted complaint triage** | Suggests a category and priority as the resident types, using a free keyword classifier by default — with a documented, inert upgrade path to a real Claude API call. |
| **Admin dashboard** | Complaint totals by status and category, overdue count — all computed live at query time, no stats table to keep in sync. |
| **Multi-tenancy** | Every society gets its own subdomain (`greenvalley.yourdomain.com`), branding, users, and data — isolated by a mandatory `tenantId` scope enforced at the repository layer. |
| **Role-based access** | Five roles (Super Admin, Admin, Resident, Watchman, Maintenance Staff), each route explicitly gated — not inferred from what a service function happens to do with a role it wasn't checking for. |

---

## Architecture

### Tenancy model
**Shared database, shared schema, row-level isolation via `tenantId`.** Database-per-tenant doesn't scale operationally past a handful of societies (migrations, backups, and monitoring all multiply by tenant count); schema-per-tenant is a similar operational burden without a real isolation benefit at this scale. One schema, one `tenantId` column on every tenant-owned table, and every repository method takes `tenantId` as a mandatory first argument — never optional, never inferred.

### Request lifecycle
```
Client → NGINX (TLS, reverse proxy)
       → Tenant resolver middleware (subdomain → tenant context)
       → Auth middleware (JWT verify + tenant-match check)
       → RBAC middleware (role allow-list per route)
       → Controller (thin — parses request, calls one service method)
       → Service (business logic — status transitions, overdue calc, notification triggers)
       → Repository (the ONLY layer that touches Prisma — every query tenant-scoped)
       → MySQL
```
Auth deliberately runs *after* tenant resolution, not before — the JWT's `tenantId` claim is checked *against* the already-resolved tenant, which is what stops a token issued for one society being replayed against another's subdomain.

### Authentication
Short-lived (15 min) JWT access tokens — stateless, so they can't be revoked before expiry, which is exactly why they're kept short. Refresh tokens are the opposite: only their SHA-256 hash is stored and trusted, which makes them genuinely revocable and enables rotation-on-use (each refresh invalidates the old token and issues a new one — a stolen-and-reused refresh token is detectable, because the legitimate user's next refresh attempt will fail against an already-revoked hash).

### Design patterns actually used (not just listed)
- **Repository pattern** — the tenant-isolation enforcement point; no query anywhere skips a `tenantId` filter.
- **Service layer** — business rules (status transitions, overdue math) live independent of Express, testable without a running server.
- **Strategy pattern** — storage (Cloudinary/S3), email (Nodemailer/SES), and AI triage (keyword/LLM) each sit behind a shared interface with two real implementations, proving the abstraction holds.
- **Centralized error handling** — a typed `AppError` hierarchy (`NotFoundError`, `ForbiddenError`, `ValidationError`, etc.) and one error-handling middleware; no controller assembles its own error response.
- **Transactional writes** — every multi-table write (complaint + its first history row, status update + history row, tenant + its first admin) is wrapped in a Prisma transaction, so partial writes can't leave the database in an inconsistent state.

---

## API summary

Base path `/api/v1`, tenant resolved from the subdomain (never from the URL path). Full contract details are documented per-module; the shape:

| Module | Key endpoints |
|---|---|
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`, `GET /auth/flats-lookup` |
| Complaints | `GET/POST /complaints`, `GET /complaints/:id`, `PATCH /complaints/:id/status`, `PATCH /complaints/:id/priority`, `POST /complaints/suggest` (AI triage) |
| Notices | `GET/POST /notices`, `PATCH/DELETE /notices/:id` |
| Gate | `POST /gate/passes`, `GET /gate/passes`, `POST /gate/check-in`, `POST /gate/check-out` |
| SOS | `POST /sos`, `GET /sos`, `PATCH /sos/:id/acknowledge`, `PATCH /sos/:id/resolve` |
| Billing | `POST /billing/bills/generate`, `GET /billing/bills`, `POST /billing/bills/:id/pay/order`, `POST /billing/payments/verify` |
| Polls | `GET/POST /polls`, `POST /polls/:id/vote` |
| Dashboard | `GET /dashboard/summary` |
| Super Admin | `POST /super-admin/auth/login`, `POST /super-admin/tenants`, `GET /super-admin/tenants` |

Every response follows one envelope: `{ success: true, data, meta? }` or `{ success: false, error: { code, message, details? } }`.

---

## Frontend

React (Vite) + Tailwind, feature-based structure (`src/features/<module>/{pages,components,api}`), one Axios instance with a queued-single-refresh interceptor (concurrent 401s trigger exactly one `/auth/refresh` call, not a stampede). Tenant branding (`logoUrl`, `primaryColor`, `secondaryColor`) is applied at runtime via CSS custom properties, so every society renders with its own identity from the same codebase, zero per-tenant code branches. Dark mode is a separate, orthogonal toggle from tenant branding.

## Backend

Node/Express, layered `controller → service → repository`, Prisma ORM against MySQL. Every module follows the same shape as the Complaints module (the most fully realized one) — repository handles all tenant-scoped queries, service holds business rules, controller stays thin, routes declare RBAC explicitly per endpoint.

---

## Known issues found & fixed

Real bugs, found by actually running things — tests, linters, a live database — not by re-reading code:

1. **Overdue-first sorting** was applied after pagination, so an overdue complaint on page 2 could never surface to page 1 — fixed by sorting the full result set before slicing.
2. **RBAC gap**: Watchman/Maintenance Staff accounts had no route-level gate on the complaints list, falling into an implicit "trusted like admin" branch — fixed with explicit role gates and a regression test.
3. **Validation coercion bug**: parsed/coerced query params were never written back to the request, so `?sortOverdueFirst=false` evaluated as truthy — fixed, caught by a failing unit test.
4. **SOS alert sorting** put "acknowledged" before "active" alphabetically, burying urgent unhandled alerts — fixed with an explicit priority order.
5. **DB init script swallowed its own errors**, making real failures undebuggable — fixed, caught by actually running the script against a live database.
6. **Ansible playbook failed strict lint** (deprecated module, `become`/`changed_when` scoping) — fixed to a clean pass at every profile level.

Full detail on each, plus everything that was validated as *correct*, is on the [showcase page](./marketing/index.html#build-log).

---

## Local development

```bash
# Backend
cd backend
npm install
cp .env.example .env       # fill in DATABASE_URL and two different JWT secrets
npx prisma migrate dev     # or: npm run init-db (no-internet fallback, see script comments)
npm test                   # expect 23 passing
npm run dev                # localhost:4000

# Frontend, separate terminal
cd frontend
npm install
npm run dev                # localhost:5173, proxies /api to :4000
```

The app is multi-tenant — nothing renders until a society exists. Create a Super Admin user directly in the database, log in via `/api/v1/super-admin/auth/login`, then `POST /api/v1/super-admin/tenants` to create your first society:

```bash
node -e "require('bcrypt').hash('yourpassword', 12).then(console.log)"
# insert the resulting hash into a User row with role=SUPER_ADMIN, tenantId=NULL

curl -X POST http://localhost:4000/api/v1/super-admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"super@admin.com","password":"yourpassword"}'

curl -X POST http://localhost:4000/api/v1/super-admin/tenants \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <accessToken>" \
  -d '{"name":"Greenvalley Society","slug":"greenvalley","adminEmail":"admin@greenvalley.com","adminPassword":"adminpass123"}'
```

Then visit `http://greenvalley.localhost:5173` and log in with the admin credentials just created.

---

## Deploying to AWS

Full runbook in [`DEPLOYMENT.md`](./DEPLOYMENT.md). Shape: **Terraform** provisions EC2 + RDS + networking → **Ansible** installs Docker and does the first deploy → **GitHub Actions** handles every deploy after that.

### How a reviewer actually sees this once deployed

Because it's multi-tenant with no purchased domain required (Phase 1's decision — subdomains work via [nip.io](https://nip.io), a free wildcard DNS service), a live deployment looks like:

```
https://demo.<your-elastic-ip>.nip.io
```

Anyone visiting that URL sees the branded login page for whichever demo society you've set up (logo, name, and accent color pulled from that tenant's own branding — Phase 8's theming design). A reviewer with demo credentials can log in as an admin (see the dashboard, gate log, SOS alerts, billing) or a resident (raise a complaint, generate a visitor pass, vote in a poll) — the exact same app, entirely data-driven per society, no separate deployment needed to demo different roles.

To make this concrete for your own deployment: after running Terraform + Ansible, create one demo tenant via the Super Admin API (same commands as Local development above, just pointed at your production URL), then share that tenant's subdomain and a demo login.

---

## Project structure

```
backend/    Node/Express API — src/modules/<name>/ per feature, src/services/ for cross-cutting adapters
frontend/   React (Vite) SPA — src/features/<name>/ per feature
infra/      Terraform, Ansible, NGINX config
.github/    CI/CD pipeline
marketing/  Standalone showcase/landing page (this repo's "front door" for non-technical viewers)
```

## Tech stack

React · Vite · Tailwind CSS · D3.js · Node.js · Express · Prisma · MySQL · Docker · NGINX · Terraform · Ansible · GitHub Actions · AWS (EC2 + RDS) · Cloudinary · Razorpay
