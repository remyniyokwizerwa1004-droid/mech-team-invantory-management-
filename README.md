# Mechanical Team Inventory

A web app for tracking the mechanical team's tools and materials, the requests to
restock them, and the repair tickets raised against them.

**Anyone with the link can search stock and locations without signing in.**
Everything that changes data needs an account, and what each account may change
depends on its role.

---

## Run it on your machine

You need [Node.js](https://nodejs.org) 20.9 or newer. Nothing else, and no
online accounts, to get it running locally.

Open three things in order. The first two stay running.

```bash
npm install         # once
npm run db:start    # terminal 1 — a Postgres database on your machine
npm run db:migrate  # terminal 2 — creates the tables
npm run db:seed     # terminal 2 — fills them with example data
npm run dev         # terminal 2 — starts the app
```

Then open <http://localhost:3000>.

`npm run db:start` prints a `DATABASE_URL` when it starts. If the port ever
changes, copy the new URL into `.env`.

### Signing in

The seed creates one account per role. They all use the password
`ChangeMe123!`.

| Email                    | Role              | Can do                                            |
| ------------------------ | ----------------- | ------------------------------------------------- |
| `admin@mechteam.local`   | Super admin       | Everything, including locations and team accounts |
| `manager@mechteam.local` | Inventory manager | Stock, requests, tickets. Not locations           |
| `tech@mechteam.local`    | Teammate          | Raise requests, report faults, add notes          |

Storage locations are super admin only. Every item is filed under one, so
moving or deleting a location affects the whole inventory.

**Change these passwords before anyone outside the team gets the link.** Sign in
as the super admin, open **Team**, and reset each one.

### Useful commands

| Command              | What it does                                            |
| -------------------- | ------------------------------------------------------- |
| `npm run dev`        | Start the app for development                           |
| `npm run build`      | Production build, the same one Vercel runs              |
| `npm run typecheck`  | Check types without building                            |
| `npm run db:studio`  | Browse and edit the database in your browser            |
| `npm run db:reset`   | Wipe the database and rebuild it from scratch           |
| `npm run db:seed`    | Reload the example data (local only, never production)  |
| `npm run db:admin`   | Create or reset a super admin account                   |

---

## How permissions work

Roles are defined in one file: `src/lib/permissions.ts`. Code never asks "is
this person an admin?", it asks "may this person do `tool:write`?". That makes
adding a fourth role later a one-line change.

```ts
const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  SUPER_ADMIN: PERMISSIONS,
  INVENTORY_MANAGER: ["tool:write", "tool:delete", "ticket:manage", ...],
  TEAMMATE: ["requisition:create", "ticket:create"],
};
```

To add a role: add it to the `UserRole` enum in `prisma/schema.prisma`, run
`npm run db:migrate`, then give it a row in that table. Nothing else changes.

**Every write is checked on the server.** Each action starts with
`assertPermission(...)`, which reads the user from the database rather than
trusting the browser's cookie. Hiding a button in the interface is a
convenience, never the control. `src/proxy.ts` bounces signed-out visitors away
from protected pages early, but it is a filter, not the boundary.

---

## Where things live

```
prisma/schema.prisma      The data model. Change it, then run npm run db:migrate
prisma/seed.ts            Example data

src/app/                  One folder per page
  page.tsx                  Public inventory search  ← the most important page
  tools/[id]/               Public tool detail, plus the edit form
  tools/manage/             Bulk removal and clearing the example data
  dashboard/                Reporting, managers and admins only
  requisitions/             Procurement requests
  tickets/                  Repair tickets
  locations/                Storage location management
  admin/users/              Team accounts, super admin only

src/lib/
  auth.ts                   Who is making this request, and may they do it
  permissions.ts            The role table
  session.ts                Signed login cookie
  db.ts                     Database client
  actions/                  Every write the app can perform
  display.ts                Labels and colours for statuses
  workflow.ts               Which status may follow which

src/components/
  ui/                       Buttons, cards, badges, form fields
  *.tsx                     Forms and panels for each feature

src/proxy.ts                Early redirect for signed-out visitors
```

### Two design decisions worth knowing

**Stock status is calculated, not typed in.** A tool is `FINISHED` at zero,
`LOW_STOCK` at or below its low-stock level, otherwise `AVAILABLE`. That means
the public page can never disagree with the quantity. `RETIRED` is the one
status a person sets by hand, and quantity does not override it. The rule lives
in `src/lib/inventory.ts`.

**Locations nest.** A shelf sits inside a room. Searching the room finds
everything on its shelves, because the query expands to the whole branch.

**A repair ticket says who is on it, not just what stage it is at.** A fault
can sit at "Open" for a fortnight with nobody assigned, and in a list that
looks the same as one somebody picked up an hour ago. So every ticket also
shows one of four states, derived in `src/lib/tickets.ts`:

| State | Means |
| --- | --- |
| Nobody is on this yet | Reported, still open, not assigned to anyone |
| Has it, not started yet | Assigned, but work has not begun |
| Working on it | Someone has it in progress |
| Dealt with | Resolved or closed |

Unattended faults sort to the top of the list, show a red banner above it, and
put a count on the Tickets tab that everyone on the team sees from every page.

---

## How much can it hold?

Measured on this machine by loading 5,000 items into the database and timing
the real pages.

| | |
| --- | --- |
| Storage per item | about 1.1 KB, including its indexes |
| 10,000 items | about 10 MB of database |
| 100,000 items | about 104 MB of database |
| Inventory page at 5,028 items | 0.9 seconds |
| Search at 5,028 items | 0.3 seconds |

Lists are paged at 50 rows, so page render time stays flat no matter how large
the inventory grows. Searching and filtering happen in the database against
indexed columns, not in the browser.

There is no cap built into the app. The practical limit is your database plan's
storage, and even a small free tier holds far more than a mechanical team will
ever have. Growth beyond that comes from history rather than items: every stock
change writes an audit row, so a busy year adds far more log rows than tools.

### Clearing the example data

The app ships with 28 example items so every screen has something to show.
Sign in as a super admin, open **Manage items**, and use **Remove all sample
items**. That clears the example tools with their requests and tickets, and
leaves your storage locations and team accounts alone.

Sample records are recognised by their fixed id prefixes, set in
`src/lib/sample-data.ts`. Anything added through the app gets a generated id
that cannot match, so a real item can never be swept up by the clear-out.

---

## Putting it online

The result is a public URL you can share with the team. Everything below has a
free tier.

### 1. Get a database

Create a free Postgres database at [Neon](https://neon.tech),
[Supabase](https://supabase.com) or [Railway](https://railway.app). Copy the
connection string it gives you. It looks like:

```
postgresql://user:password@host.neon.tech/dbname?sslmode=require
```

Neon and Supabase both give you two forms of the string. Use the **pooled**
one, the host with `-pooler` in it. Serverless functions open and close
connections constantly, and the direct string runs out of them.

### 2. Push the code to GitHub

Create an empty repository at [github.com/new](https://github.com/new). Do not
tick "Add a README", the project already has one. Then, replacing the two
placeholders:

```bash
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
git push -u origin main
```

A browser window opens for you to sign in to GitHub. Nothing is typed into the
terminal.

`.env` is git-ignored, so your local database URL and session secret never
leave your machine.

### 3. Deploy on Vercel

1. Sign in to [Vercel](https://vercel.com) with your GitHub account.
2. **Add New → Project**, and pick the repository.
3. Before clicking Deploy, open **Environment Variables** and add:

   | Name             | Value                                                       |
   | ---------------- | ----------------------------------------------------------- |
   | `DATABASE_URL`   | The connection string from step 1                           |
   | `SESSION_SECRET` | A fresh random string, see below                            |

   Generate the secret and paste the output:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

   Use a **different** secret from your local one. Leave `SHADOW_DATABASE_URL`
   unset in production.

4. Deploy. Vercel rebuilds automatically on every push from now on.

The tables build themselves. `vercel-build` runs `prisma migrate deploy` before
every build, so the live database always matches the schema in the repo.

### 4. Create your account on the live site

The live database has tables but no users, so nobody can sign in yet. From your
machine, pointed at the production database once:

```powershell
$env:DATABASE_URL = "postgresql://...your production string..."
npm run db:admin -- "Your Name" you@example.com "a long password"
```

That creates a single super admin and nothing else. Open your Vercel URL, sign
in, and add the rest of the team under **Team**.

Do not run `npm run db:seed` against production. It fills the database with 28
example tools, which is the opposite of what you want on a live site.

Close that terminal afterwards, or the production connection string stays in
its environment.

---

## Before you show it to anyone

- [ ] Your admin password is long and not one you use elsewhere
- [ ] `SESSION_SECRET` in Vercel differs from the one in your local `.env`
- [ ] Real team members added under **Team**, with the right roles
- [ ] Your actual storage locations set up under **Locations**
- [ ] No example items left, check **Manage items**
- [ ] `.env` never committed (check with `git status`)

The demo-account panel on the login page only renders outside production, so it
will not appear on the live site.

---

## Notes

- `npm audit` reports four high-severity advisories. All four are inside the
  Prisma command-line tool, which is a development dependency and is not part of
  what gets deployed. Nothing in the shipped app is affected.
- Times are shown in the server's timezone. On Vercel that is UTC. Set a `TZ`
  environment variable if the team would rather see local time.
- Photos on repair tickets are not built yet. The data model has room for them
  and it is the natural next feature.
