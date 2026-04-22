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
