# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.


## Image uploads (room images)
- Admin uploads (POST /api/admin/upload) write to **Object Storage** (GCS bucket via Replit sidecar auth) under prefix `<PRIVATE_OBJECT_DIR>/uploads/`. Helper: artifacts/api-server/src/lib/gcs.ts.
- Served via GET /api/images/uploads/:name which streams from GCS (mounted in artifacts/api-server/src/index.ts BEFORE the express.static handler so the dynamic route wins).
- Other /api/images/* paths still served from disk (attached_assets/) for the original hotel-N.jpeg seed images.
- This makes uploads durable across autoscale container restarts and instances. Required env: PRIVATE_OBJECT_DIR, DEFAULT_OBJECT_STORAGE_BUCKET_ID (auto-set by setupObjectStorage).

## Reception / Branches feature
- Two staff roles: `admin` (full) and `reception` (operations only). Seed accounts: admin@hotel.com / admin123 and reception@hotel.com / reception123.
- Tables (defined in lib/db/src/schema): `branches` (id, name, nameAr, address, phone), `payments` (bookingId, amount, method, branchId, branchName, receivedById, receivedByName, note). `users.branchId` assigns a receptionist to a branch. `bookings.paidAmount` + `bookings.paymentStatus` (unpaid|partial|paid) cache the running payment state.
- Schema changes are applied at startup via `ensureExtendedSchema()` in artifacts/api-server/src/lib/seed.ts (idempotent ALTERs + CREATE TABLE IF NOT EXISTS) — no migration files required for these tables.
- Auth helpers in artifacts/api-server/src/lib/auth.ts: `requireAdmin()` (admin only) and `requireStaff()` (admin OR reception).
- Endpoint authorization map (all under `/api/admin/...`):
  - admin only: `GET /stats`, `GET /bookings-timeseries`, `POST/PATCH/DELETE /branches`, `GET /users/staff`, `PATCH /users/:id`, `DELETE /rooms/:id`, anything in admin-staff that explicitly applies `requireAdmin()`.
  - staff (admin + reception): everything else (`/calendar`, `/recent-bookings`, `/guests`, `/bookings*`, `/bookings/:id/payments`, `/bookings/by-reference/:ref`, `/bookings/:id/full`, `POST /users` for guest creation, `POST /admin/upload`, `POST /admin/rooms`, `PATCH /admin/rooms/:id`).
- Reception-only constraints enforced server-side:
  - cannot create staff (`POST /admin/users` with role !== guest is rejected for reception).
  - payments are always attributed to their `users.branchId` — `branchId` in the body is ignored for reception. If reception has no assigned branch, payment recording returns 400.
- Payment write is wrapped in a Drizzle transaction with `SELECT ... FOR UPDATE` on the booking row to keep `paidAmount` / `paymentStatus` consistent under concurrent writes (admin-staff.ts).
- Frontend: AdminLayout (artifacts/hotel/src/components/AdminLayout.tsx) is role-aware and hides Branches/Settings/Finance for reception. New page artifacts/hotel/src/pages/admin/Branches.tsx (admin-only via in-component Redirect) covers branch CRUD and staff/branch assignment. Bookings page has a reference/name search, a "New booking" dialog, a payment status chip per row, and a "Record payment" dialog. Guests page has an "Add customer" dialog that returns an auto-generated temporary password if one isn't supplied. New endpoints are consumed via raw `fetch` + react-query (cookie-session auth, credentials baked into the global fetch wrapper in main.tsx) — they are NOT in the OpenAPI spec, so codegen does not need to be re-run for them.
- i18n keys for the feature live in artifacts/hotel/src/lib/i18n.tsx under both `ar` and `en` blocks; new keys are prefixed `admin.*` (branches, role, payment*, etc.) plus a few `common.*` additions.
