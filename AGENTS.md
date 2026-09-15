<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Mechanical Team Inventory

Tool and material tracking for a team that maintains teleoperation robots.
See README.md for setup and deployment.

## Stack

Next.js 16 (App Router, Turbopack), React 19, Tailwind v4, Prisma 7 with
PostgreSQL. Auth is a signed JWT in an httpOnly cookie via `jose`, not
NextAuth — the app only needs email and password, and NextAuth's Next 16
support was still in beta.

Prisma 7 specifics: the client is generated to `src/generated/prisma` and
imported from `@/generated/prisma/client`, never from `@prisma/client`. It
requires an explicit driver adapter (`PrismaPg`). Config lives in
`prisma7.config.ts`, and `prisma@latest` currently resolves to an 8.0
release candidate, so the CLI is pinned to 7.10.0.

## Rules that matter

- **Every server action starts with `assertPermission(...)`** from
  `src/lib/auth.ts`. Hiding a control in the UI is never the access control.
  Anyone without the permission posting straight at an action must be
  refused by the action.
- **Ask for a permission, never a role.** Add capabilities to
  `src/lib/permissions.ts` so new roles stay a one-line change.
- **Stock status is derived from quantity** in `src/lib/inventory.ts`, except
  `RETIRED`, which a person sets. Do not let a form write a status that
  contradicts the quantity.
- **Every change to a tool writes an `InventoryLog` row in the same
  transaction.** Requests and tickets do the same through their event tables.
- **Reads stay open to the public.** `/` and `/tools/[id]` must render with no
  session. Do not add an auth check to them.
- `src/proxy.ts` is an early filter for signed-out visitors, not a boundary.
- Every export from a `"use server"` file must be an async function. Shared
  synchronous helpers belong in `src/lib/workflow.ts` or similar.
- Pages that read the database set `export const dynamic = "force-dynamic"`,
  so the Vercel build never needs a reachable database.

## Checking work

`npm run typecheck` and `npm run build` both need to pass. There is no test
suite yet; verify behaviour against a running `npm run dev` with the seeded
data.
