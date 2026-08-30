# Jewelry E‑Commerce

Hebrew, RTL, Israel‑only jewelry storefront.

**Current state: Phase 2B — production data model.**
The full database schema (38 models), its migration, the inventory reservation
domain, validation schemas and a demo seed all exist and are tested against a
real PostgreSQL. There is still no storefront, admin UI, cart UI, checkout,
payment or authentication screens.

## Documents

| Document                                           | Role                                                          |
| -------------------------------------------------- | ------------------------------------------------------------- |
| [MASTER_SPECIFICATION.md](MASTER_SPECIFICATION.md) | **Source of truth.** Product and business requirements.       |
| [ARCHITECTURE.md](ARCHITECTURE.md)                 | Technical architecture proposal.                              |
| [DATA_MODEL.md](DATA_MODEL.md)                     | Entity design. Implemented in Phase 2.                        |
| [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)   | Phased delivery plan.                                         |
| [TBD.md](TBD.md)                                   | Every unresolved decision. Nothing is invented to fill a gap. |
| [docs/DECISIONS.md](docs/DECISIONS.md)             | Decisions taken during implementation.                        |

## Prerequisites

| Tool    | Version                         | Why                                                                                                         |
| ------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Node.js | ≥ 20.12 (developed on 24.14.1)  | 20.12 is where `process.loadEnvFile` lands, which `prisma.config.ts` uses instead of a `dotenv` dependency. |
| npm     | any current                     | The project's package manager (TBD.md I5).                                                                  |
| Docker  | any current, **daemon running** | Local PostgreSQL. No local `psql` install is needed.                                                        |

## Local development

```bash
npm install          # postinstall also runs `prisma generate`
cp .env.example .env # development-only credentials, matching docker-compose.yml
npm run db:up        # starts PostgreSQL 16 and waits for its healthcheck
npm run db:migrate   # applies the migration
npm run db:seed      # loads clearly-marked demo catalog data
npm run dev
```

Then open <http://localhost:3000>.

### Database

PostgreSQL 16 runs in Docker for local development
([docker-compose.yml](docker-compose.yml)). Credentials are development‑only
and committed on purpose, so `npm run db:up` needs no setup. Data survives
restarts in a named volume.

```bash
npm run db:up     # start, and wait until healthy
npm run db:down   # stop (the volume is kept)
```

`docker compose down -v` also drops the volume, discarding all local data.

The container is published on **host port 5433**, not the usual 5432, so it
does not collide with a system PostgreSQL install or another project's
container. `.env.example` already points at it.

> Compose is given an explicit `name:` in the file. Without it, every Compose
> command fails here — see [docs/DECISIONS.md](docs/DECISIONS.md) D1.8.

### Prisma

The schema is [prisma/schema.prisma](prisma/schema.prisma) — 38 models, 18
enums. It is the source of truth; [DATA_MODEL.md](DATA_MODEL.md) is the design
rationale that preceded it.

```bash
npm run db:migrate   # apply pending migrations
npm run db:generate  # regenerate the client into src/generated/prisma
npm run db:validate  # check the schema
npm run db:format    # format the schema
npm run db:seed      # reload demo catalog data
npm run db:reset     # drop, re-migrate and re-seed  (destroys local data)
```

> **The migration is hand-edited and must not be regenerated.** It carries 35
> CHECK constraints, a `NULLS NOT DISTINCT` wishlist index, the order-number
> sequences and the trigram search indexes — none of which Prisma's schema
> language can express. Re-running `prisma migrate dev --create-only` over it
> would silently drop all of them. A banner at the top of the file says so, and
> [docs/DECISIONS.md](docs/DECISIONS.md) D2.6 explains each constraint.

Adding a schema change: edit `schema.prisma`, run
`npx prisma migrate dev --name <change> --create-only`, hand-add any raw SQL the
change needs, then `npm run db:migrate`.

Prisma 7 changed the setup materially — connection config lives in
[prisma.config.ts](prisma.config.ts), not in the schema, and the client
connects through a driver adapter. See
[docs/DECISIONS.md](docs/DECISIONS.md) D1.7.

### Environment

`.env.example` is committed; every other `.env*` file is git‑ignored. **No
secret belongs in this repository.**

Variables are declared once, in
[src/lib/env/schema.ts](src/lib/env/schema.ts), and validated on first import
of `@/lib/env`. Reading `process.env` anywhere else is a bug. Two variables
exist today:

| Variable               | Required            | Notes                                                                            |
| ---------------------- | ------------------- | -------------------------------------------------------------------------------- |
| `DATABASE_URL`         | **yes**, no default | A default would silently point a misconfigured deployment at the wrong database. |
| `NEXT_PUBLIC_SITE_URL` | no                  | Defaults to `http://localhost:3000`.                                             |

Provider credentials (payment, invoicing, email, storage) are deliberately
absent: no provider has been chosen, and no code reads them.

## Validation

```bash
npm run db:up   # integration tests need a real database
npm run verify
```

runs lint → typecheck → test → build.

**Tests require PostgreSQL.** The inventory reservation race, the CHECK
constraints and the wishlist index live in the database and cannot be asserted
against a mock, so integration tests run against a real `jewelry_test` database
that Vitest creates and migrates. They fail loudly when the database is missing
rather than skipping silently — a skipped concurrency test is worse than none. Per IMPLEMENTATION_PLAN, "validation is a
gate, not a step": a phase is not complete while `npm run verify` fails.

| Script                                               | What it does               |
| ---------------------------------------------------- | -------------------------- |
| `npm run dev`                                        | Development server         |
| `npm run build`                                      | Production build           |
| `npm run start`                                      | Serve the production build |
| `npm run lint` / `lint:fix`                          | ESLint                     |
| `npm run typecheck`                                  | `tsc --noEmit`             |
| `npm test` / `test:watch`                            | Vitest                     |
| `npm run format` / `format:check`                    | Prettier                   |
| `npm run db:up` / `db:down`                          | Local PostgreSQL           |
| `npm run db:migrate` / `db:generate` / `db:validate` | Prisma                     |
| `npm run db:seed` / `db:reset`                       | Demo data                  |
| `npm run verify`                                     | **The phase gate.**        |

## Layout

```
.
├── docs/DECISIONS.md          # implementation decisions
├── docker-compose.yml         # local PostgreSQL 16
├── prisma/schema.prisma       # datasource + generator only
├── prisma.config.ts           # Prisma 7 CLI connection config
└── src/
    ├── app/                   # App Router routes only
    │   ├── globals.css        # Tailwind entry, base layer, icon-mirroring utility
    │   ├── layout.tsx         # <html lang="he" dir="rtl">
    │   └── page.tsx           # Phase 1 placeholder
    ├── generated/prisma/      # generated client (git-ignored)
    ├── lib/                   # business logic; `app/` orchestrates, `lib/` decides
    │   ├── config/site.ts     # locale / direction contract
    │   ├── db/                # the single Prisma client
    │   ├── env/               # zod-validated environment
    │   ├── fonts.ts           # the one place the brand font is configured
    │   ├── money/             # integer-agorot arithmetic and formatting
    │   └── rtl/               # <Bidi> for embedded LTR runs
    └── styles/tokens.css      # design tokens
```

The fuller target structure (`components/`, `lib/pricing`, `lib/inventory`,
`lib/integrations`, `server/actions`, …) is specified in ARCHITECTURE §3.4 and
is created as each phase fills it — empty directories are not committed.

Path alias: `@/*` → `src/*`, honoured by TypeScript, Next.js and Vitest.

## Conventions that later phases must hold

- **Money is integer agorot.** Never a float. All arithmetic and formatting
  goes through `@/lib/money`; nothing computes a price inline.
  ([docs/DECISIONS.md](docs/DECISIONS.md) D0.1, D1.4)
- **Design values come from tokens.** No literal colour, radius, shadow or font
  name in a component — `bg-background`, not `bg-[#faf9f7]`. The brand is still
  TBD and must remain a single‑file change. (D1.1, D1.2)
- **RTL is structural.** `dir="rtl"` is set once on `<html>`. Customer‑facing
  code uses logical utilities only (`ms-*`, `pe-*`, `start-*`, `text-start`);
  physical ones (`ml-*`, `pr-*`, `left-*`, `text-left`) are rejected by ESLint.
  Embedded Latin terms are wrapped in `<Bidi>`. Directional icons opt into
  mirroring with `.icon-directional`; cart, heart and search never mirror.
  (D1.3)
- **Environment comes from `@/lib/env`**, never `process.env`. (D1.5)
- **One Prisma client**, from `@/lib/db`. Never construct another. (D1.7)
- **zod for all validation**, server-side on every mutation. (D1.6)
- **The server is authoritative.** Price, discount, inventory and availability
  are recomputed server‑side; client‑submitted values are never trusted.
- **No fake integrations.** A port with no chosen provider gets no
  implementation that pretends to succeed.
- **`any` requires a written justification** at the point of use. ESLint errors
  on it otherwise.

## Note on OneDrive

The working copy lives at `C:\dev\אתר חנות תכשיטים`, outside the OneDrive root,
which is deliberate: OneDrive syncing `node_modules/` and `.next/` causes file
locking and rebuild stalls on Windows. **Keep it outside OneDrive.**

A copy of the specification documents still exists at
`C:\Users\olete\OneDrive\Desktop\אתר חנות תכשיטים`. It is not this repository
and will silently go stale. Deleting it is recommended, but that is your call —
nothing here has touched it.
