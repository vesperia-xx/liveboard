# Realtime Team Workspace

Collaborative project platform with a Kanban board, live presence, comments, activity feed and notifications. Built as a full-stack portfolio project.

## Features

- **Auth from scratch** — JWT (HS256, `jose`) stored in an `httpOnly` cookie, `bcryptjs` password hashing, route protection in `src/proxy.ts`.
- **Workspaces & roles** — `OWNER` / `ADMIN` / `MEMBER`, invite by email, role-based authorization on every resource.
- **Projects & Kanban** — 4 columns, drag & drop with `@dnd-kit`, priorities, due dates, assignees, delete.
- **Realtime** — dual transport selected by env: Socket.io (local) or Pusher presence channel (production/Vercel); both authorize workspace membership before joining.
- **Server-authoritative events** — mutations publish from API routes (`src/lib/realtime.ts`); the client never emits data events.
- **Presence** — who is viewing the board, live online count.
- **Comments** — per-task threads, delivered live to everyone on the board.
- **Activity feed** — timeline of moves, assignments, comments and project creation.
- **Notifications** — assignment, comment and invitation notifications with unread counter.
- **Optimistic UI** — TanStack Query mutations with snapshot rollback on failure.
- **Offline awareness** — connection banner, automatic re-sync (query invalidation) after reconnect.
- **Shareable meta** — dynamic 1200×630 OpenGraph/Twitter card generated at build time with `next/og`.

## Stack

Next.js 16 (App Router) · TypeScript (strict) · Tailwind CSS v4 · PostgreSQL · Prisma · Socket.io · TanStack Query · Zod · Docker

## Local setup

```bash
# 1. Postgres + Redis
docker compose up -d

# 2. Dependencies (runs prisma generate)
npm install

# 3. Environment
cp .env.example .env   # or create .env manually

# 4. Schema
npm run db:push

# 5. Dev server (Next + Socket.io)
npm run dev
```

App: http://localhost:3000

`.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/realtime_workspace?schema=public"
JWT_SECRET="change-me"
PORT=3000
```

> Docker maps Postgres to **5433** and Redis to **6380** to avoid clashing with other local projects.

## Scripts

| Script              | Description                              |
| ------------------- | ---------------------------------------- |
| `npm run dev`       | Next.js + Socket.io server (`server.js`) |
| `npm run build`     | `prisma generate && next build`          |
| `npm run start`     | Production server (requires `NODE_ENV`)  |
| `npm run typecheck` | `tsc --noEmit`                           |
| `npm run smoke`     | E2E smoke test against a running server  |
| `npm run db:push`   | Sync Prisma schema                      |
| `npm run db:studio` | Prisma Studio                            |

## Smoke test

With the server running:

```bash
npm run smoke              # http://localhost:3000
npm run smoke -- https://liveboard-chi.vercel.app
```

Covers authentication, validation, workspace isolation (403s for outsiders), invites, task moves, assignment, comments, activity, notifications and socket authorization (37 checks). In local mode it exercises Socket.io; against a deployed URL it exercises Pusher channel authorization.

## CI (GitHub Actions)

`.github/workflows/ci.yml` runs on every push/PR to `main`:

1. `npm ci` (runs `prisma generate`)
2. `npm run typecheck`
3. `prisma migrate deploy` against a **throwaway Postgres service container** (fresh DB per run/PR)
4. `npm run build`
5. Production server (`NODE_ENV=production node server.js`) + `npm run smoke`

No external secrets are needed: the database and `JWT_SECRET` are ephemeral CI values, and without `PUSHER_*` the smoke test uses the Socket.io path. Server logs are uploaded as an artifact if the job fails.

## Architecture

```
UI (App Router pages, client components)
  ↓ TanStack Query (cache + optimistic mutations)
API routes (src/app/api/**)      Realtime (src/lib/realtime.ts)
  ↓ Zod validation                ↓ Pusher (if PUSHER_*) or Socket.io (server.js)
  ↓ authz helpers (src/lib/authz) ↓ authorize channel via membership
Prisma → PostgreSQL
```

### Authorization model

| Layer      | Check                                                                |
| ---------- | -------------------------------------------------------------------- |
| Proxy      | Signed session cookie required for `/workspaces`, `/projects`         |
| API        | `getAuthUser()` + `getProjectAccess()` / `getWorkspaceRole()`         |
| Mutation   | Role rules (`OWNER`/`ADMIN` manage projects and members)              |
| WebSocket  | JWT from handshake cookie + workspace membership before `join-project`|

Every resource is scoped: a user outside a workspace receives `403` on reads, writes, deletes, activity and notifications.

### Realtime events

Server → client: `task-created`, `task-updated`, `task-deleted`, `comment-created` (payload = persisted entity), plus `presence:update` / Pusher membership events.

Events are published server-side from the REST handlers after the database write. The client merges them into the TanStack Query cache and dedupes by id (it also applies its own mutation result). On reconnect the client invalidates the project query, so events missed during a drop are recovered from the database.

### Migrations

El esquema inicial está en `prisma/migrations/`. Para una base de datos nueva (p.ej. Neon en producción):

```bash
DATABASE_URL="<postgres-url>" npx prisma migrate deploy
```

### Deploy a producción

Guía completa, paso a paso y verificable: **[DEPLOY.md](DEPLOY.md)** (Neon + Pusher + Vercel + smoke test contra la URL pública).

## Deployment (Vercel)

The app is Vercel-ready by default: Next.js serves the UI, API routes and Server Components, and handles authentication, Prisma and all writes.

Realtime works in two modes selected by environment variables:

| Mode            | When                          | Transport                                    |
| --------------- | ----------------------------- | -------------------------------------------- |
| Local dev       | No `PUSHER_*` set              | Socket.io via `server.js` (cookie handshake) |
| Production      | `PUSHER_*` set                 | Pusher presence channel (`/api/pusher/auth`) |

To deploy on Vercel you only add the Pusher env vars (appId, key, secret, cluster + `NEXT_PUBLIC_PUSHER_KEY/CLUSTER`) and point `DATABASE_URL` at a reachable Postgres. No custom server required; `server.js` and the Socket.io dependency become unused.

```env
PUSHER_APP_ID=…      # dashboard
PUSHER_KEY=…         # key
PUSHER_SECRET=…      # secret
PUSHER_CLUSTER=eu
NEXT_PUBLIC_PUSHER_KEY=…
NEXT_PUBLIC_PUSHER_CLUSTER=eu
DATABASE_URL=…       # e.g. Neon
JWT_SECRET=…         # random
```

Create a free Pusher app at https://dashboard.pusher.com → «App Keys». The channel is `presence-project-<id>`; authorization (workspace membership) happens in `src/app/api/pusher/auth/route.ts`, so non-members can never join or receive events.
