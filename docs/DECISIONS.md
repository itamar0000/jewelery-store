# Phase 0 — decision record

Decisions taken while scaffolding the repository, limited to those that
constrain later phases. Business decisions are **not** made here; they live in
[../TBD.md](../TBD.md). The source of truth remains
[../MASTER_SPECIFICATION.md](../MASTER_SPECIFICATION.md).

---

## D0.1 — Money is stored as integer agorot (CONFIRMED)

**Decision.** Every monetary value in this system is an integer count of
agorot (1 ILS = 100 agorot). Floating-point numbers are never used for
monetary storage, arithmetic, comparison or transport.

This confirms ARCHITECTURE §6.1 and closes TBD.md **I4**, which flagged this as
the single most urgent item in the register because it is the least reversible
decision in the project once real data exists.

**Consequences that bind later phases.**

- Prisma columns for money are `Int`, never `Float` or `Decimal`.
- A single `src/lib/money` module (Phase 1) owns all arithmetic, rounding and
  formatting. No other module performs money arithmetic inline.
- Rounding for percentage discounts is _round half up to the nearest agora,
  applied to the line total_, not per unit.
- Conversion to a decimal string happens only at the presentation boundary,
  via `Intl.NumberFormat(SITE_LOCALE, { currency: 'ILS' })`.
- JSON transport carries agorot integers. A client never sends a price.

**Nothing in Phase 0 implements this** — there is no money code yet. The
decision is recorded now because Phase 1 builds directly on it.

---

## D0.2 — Product size stays architecturally flexible (NOT DECIDED)

**Non-decision, deliberately.** Whether ring size (and necklace/bracelet
length) is a stocked variant axis or a per-line selection captured at order
time is a **business** question, not a technical one. It is TBD.md **B11** and
it stays open.

Phase 0 preserves the flexibility described in ARCHITECTURE §6.3 by not
constraining it: no schema, no enum, no product code exists yet, so no path is
closed off.

**What Phase 2 must preserve.** `ProductOption.isVariantAxis` distinguishes an
option that generates variants (its own SKU and stock) from one recorded as a
selection on the cart/order line. Gold karat and colour default to axes; size
and length default to selections. Either can be flipped **per product**, as
data, with no migration. Phase 2 must not hard-code size as either kind.

---

## D0.3 — Working copy lives outside OneDrive

The specification documents were authored at
`C:\Users\olete\OneDrive\Desktop\אתר חנות תכשיטים`. The working copy is now
`C:\dev\אתר חנות תכשיטים`, which is outside the OneDrive root
(`C:\Users\olete\OneDrive`) and is not a reparse point into it.

This resolves TBD.md **I6**: `node_modules/` and `.next/` are no longer subject
to OneDrive sync churn or its file-locking behaviour on Windows.

A byte-identical copy of the five specification documents remains in the
OneDrive folder. It has been left untouched. See the README for the
recommendation.

---

## D0.4 — Tooling choices

| Choice                                                                                                                                              | Rationale                                                                                                                                                                                                                          |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Next.js 15 (App Router) + React 19                                                                                                                  | Mandated by MASTER_SPECIFICATION §42 and ARCHITECTURE §3.1.                                                                                                                                                                        |
| npm                                                                                                                                                 | The only package manager installed (TBD.md I5).                                                                                                                                                                                    |
| TypeScript `strict` **plus** `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `noUnusedLocals`, `noUnusedParameters` | `strict` alone still allows unchecked array indexing, which is a common source of silent `undefined` in pricing and variant-matrix code.                                                                                           |
| `exactOptionalPropertyTypes` **off**                                                                                                                | It conflicts frequently with React and third-party prop types and produces churn disproportionate to the defect class it catches. Revisit if it becomes cheap.                                                                     |
| Tailwind CSS v4, configured in CSS (`@theme`)                                                                                                       | Mandated by §42. v4 has no JS config file; the design-token layer (Phase 1) is therefore plain CSS custom properties, which is what ARCHITECTURE §3.3 already assumes.                                                             |
| ESLint flat config via `FlatCompat`                                                                                                                 | `eslint-config-next` is still distributed as an eslintrc-style config.                                                                                                                                                             |
| `eslint .`, not `next lint`                                                                                                                         | `next lint` is deprecated in Next 15.5.                                                                                                                                                                                            |
| ESLint owns correctness, Prettier owns formatting                                                                                                   | `eslint-config-prettier` is applied last so the two never fight.                                                                                                                                                                   |
| Vitest, `environment: 'node'`                                                                                                                       | The highest-value tests are pricing, money, inventory and validation (ARCHITECTURE §15); none need a DOM. A DOM environment is added per-file when component tests actually arrive, rather than paying for jsdom on every run now. |
| `next build` does not re-run ESLint                                                                                                                 | Linting is its own script and its own CI step. Type errors _do_ fail the build.                                                                                                                                                    |

---

## D0.5 — RTL is established at the document root only

`<html lang="he" dir="rtl">` is set once in `src/app/layout.tsx` from the
constants in `src/lib/config/site.ts`. There is no per-component direction
handling and no `dir` attribute anywhere else.

Two rules that Phase 1 onward must hold to (ARCHITECTURE §3.2):

1. **Logical properties only** in customer-facing code — `ms-*`/`me-*`,
   `ps-*`/`pe-*`, `start-*`/`end-*`, `text-start`/`text-end`, `border-s`/
   `border-e`. Physical utilities (`ml-*`, `pr-*`, `left-*`, `text-left`) are
   forbidden. Phase 1 adds the ESLint rule that enforces this; until then it is
   a convention, and Phase 0 code follows it.
2. **Embedded LTR terms** (`14K`, `VS1`, `Rose Gold`) are wrapped by the
   Phase 1 `<Bidi>` component, never left to drift.

---

## D0.6 — What Phase 0 deliberately does not contain

No database, no Prisma schema, no environment module, no design tokens, no
money module, no fonts, no CI-hosted secrets, no storefront UI, no admin, no
auth, no ports/adapters. Each is scheduled in
[../IMPLEMENTATION_PLAN.md](../IMPLEMENTATION_PLAN.md).

Empty "future" directories were **not** created. Git cannot track them and they
would be dead structure; the intended layout is documented in ARCHITECTURE §3.4
and created when it is filled.

---

# Phase 1 — decision record

Foundations every later phase builds on: design tokens, RTL, fonts, money,
environment validation, local PostgreSQL and the Prisma boundary. Still no
storefront, admin, catalog, cart, checkout or authentication.

---

## D1.1 — Design tokens are two-layered, and every colour is provisional

`src/styles/tokens.css` holds two layers:

- **Reference tokens** (`--ref-*`) — raw values, named by what they _are_
  (`--ref-cream`). No component may reference them.
- **Semantic tokens** (`--color-background`, `--radius-md`, …) — named by what
  they are _for_. The only layer components touch.

Semantic colours are declared in Tailwind v4's `@theme inline`, so each token
also generates its utilities (`--color-accent` → `bg-accent`, `text-accent`,
`border-accent`). `inline` is required because the values are `var()`
references; plain `@theme` would freeze a copy instead of resolving through.

**The palette is not a brand decision.** Brand name, logo, palette and
typography are all TBD (§2, §57). The values encode only the documented
_direction_ — white, warm cream, pearl, black type, modern luxury boutique. The
accent is a deliberately muted brass rather than gold, because §2 warns against
black-and-gold "luxury" styling.

Contrast was measured rather than assumed: every foreground token clears 4.5:1
on white, pearl and cream (ratios are tabulated in the file). They must be
re-measured when the real palette lands. The compliance _target_ remains a
legal determination and is still TBD.

**No literal colour, radius or shadow may appear in a component.** That is the
whole point — rebranding is then a single-file edit.

---

## D1.2 — Typography: Heebo as an explicit placeholder

`src/lib/fonts.ts` is the single place the brand font is configured. It loads
**Heebo** via `next/font/google` — a placeholder, not a choice. It was picked
because it carries both Hebrew and Latin glyph sets, which §49's mixed copy
(`VS1`, `14K`, `Rose Gold` inside Hebrew sentences) requires.

The binding is indirect on purpose: `next/font` exposes a CSS variable
(`--font-hebrew-sans`), the token layer's `--font-sans` consumes it, and
Tailwind's `font-sans` resolves to that. **No component names a font.**
Swapping to a licensed brand face means editing that one file
(`next/font/local` instead of `next/font/google`) and nothing else.

`--font-display` is aliased to `--font-sans` rather than pointing at a second
family, because choosing a display face would be inventing a brand decision.

---

## D1.3 — RTL is enforced by tooling, not by discipline

Three mechanisms, in order of how much they can be relied on:

1. **Document root.** `<html lang="he" dir="rtl">` is set once in
   `src/app/layout.tsx` from `src/lib/config/site.ts`. `dir` is set as an
   _attribute_, never as a CSS `direction` declaration — the attribute reaches
   the accessibility tree and the Unicode bidi algorithm; the declaration does
   not reliably do either.

2. **An ESLint rule** (`eslint.config.mjs`) that rejects physical direction
   utilities in `className` — `ml-*`, `mr-*`, `pl-*`, `pr-*`, `left-*`,
   `right-*`, `text-left`, `text-right`, `border-l`, `border-r` — including
   variant-prefixed (`md:ml-4`), negative (`-ml-4`), important (`!mr-2`) and
   template-literal forms. Verified against 17 deliberate violations, and
   against look-alikes (`border-red-500`, `place-items-center`, `rounded-lg`)
   that correctly do not fire.

   Two accepted gaps, both deliberate rather than solved with a bespoke plugin:
   class names assembled inside a helper call (`cn('ml-4')`) are invisible to
   it, and `src/app/(admin)` is exempt because §49 governs the _customer_
   experience.

3. **`<Bidi>`** (`src/lib/rtl/bidi.tsx`) for embedded LTR runs. It applies
   `unicode-bidi: isolate` as well as `dir="ltr"` — the attribute alone does
   not stop trailing punctuation drifting to the wrong end of the line.

**Icon mirroring is opt-in.** `globals.css` provides an `.icon-directional`
utility. There is deliberately no blanket `[dir='rtl'] svg { transform:
scaleX(-1) }`: chevrons and back arrows must mirror, but a mirrored magnifying
glass or cart is simply a wrong icon (ARCHITECTURE §3.2).

---

## D1.4 — Money: branded integers, `bigint` arithmetic

`src/lib/money/` implements D0.1. Two properties it is built to guarantee:

1. **No floating-point arithmetic.** Every step that could lose precision —
   percentage discounts, decimal parsing, decimal rendering — runs through
   `bigint`. `number` only ever holds an already-exact integer count of agorot.
   Even formatting avoids it: `Intl.NumberFormat` is handed the exact decimal
   _string_, not a number.

2. **Accidental money arithmetic does not compile.** `Money` is a branded
   number, so `a + b` yields a plain `number` that no function here accepts.
   Raw numbers cannot become `Money` without passing through a validating
   constructor.

Specific choices worth recording:

- **Rounding is half _up_** (ties toward +∞), per ARCHITECTURE §6.1 — not half
  away from zero. The two differ only on negative ties: −2.5 agorot becomes −2.
- **Discounts apply to the line total, not per unit**, also per §6.1. The tests
  include a case where the two genuinely diverge (33% of ₪0.05 × 3 → 5 agorot
  by line, 6 by unit).
- **`multiply` accepts whole quantities only.** A fractional multiplier needs a
  rounding rule the caller has not stated; `percentageOf` is the explicit route.
- **Invalid input throws; it is never rounded away.** `fromShekels(0.1 + 0.2)`
  is rejected because `0.30000000000000004` is not a representable price.
  Silently rounding is how precision loss survives to production.
- **`Percent` is basis points**, so 12.5% is exact, and it is bounded to 0–100%.
- **A sanity bound** of ±10,000,000,000 agorot (₪100,000,000) turns overflow
  and typos into loud errors. It is not a business rule about prices.
- **`formatPrice` is for humans, `toShekelString` is for machines** (form
  values, schema.org, provider payloads). The formatted output keeps its
  Unicode directional marks — stripping them puts the ₪ on the wrong side of a
  price inside Hebrew copy.

Agorot display defaults to `auto` (two decimals only when the amount has
agorot). That is a presentation convention the specification does not fix, not
a business rule, and it lives in one file.

---

## D1.5 — Environment validation is fail-fast, but not at build time

`src/lib/env/` is split so validation is testable without the test run itself
needing a valid environment:

- `schema.ts` — pure zod schema and `parseEnv`, no side effects.
- `index.ts` — `export const env = parseEnv(process.env)`, evaluated at import,
  so the first import fails loudly rather than the first query.

Deliberately **not** imported from `next.config.ts`. Doing so would make every
`next build` require a database URL, and a CI build has no database. Validation
belongs where the value is used.

`DATABASE_URL` is required with **no default** — a fallback would silently
point a misconfigured deployment at the wrong database. `NEXT_PUBLIC_SITE_URL`
is defaulted, because the local origin is not a secret and is identical for
everyone.

**Error messages name variables but never their values.** `DATABASE_URL`
contains a password and this text reaches logs and crash reports (§48). A test
asserts this.

Only variables the code actually reads are in the schema. Payment, invoicing,
email and storage keys are absent: no provider is chosen (TBD.md B1, B2, I1,
I2), and declaring them would make the schema reject environments that are
valid today.

> **Note on the path.** The Phase 1 brief named `src/lib/env.ts`; it is
> realised as `src/lib/env/` per that same brief's folder-structure section.
> `@/lib/env` imports identically either way.

---

## D1.6 — zod is the single validation approach

One library for environment, forms, server actions and API boundaries, so a
schema written for a form is the same object the server validates with, and
client/server rules cannot drift (ARCHITECTURE §4).

**No `src/lib/validation/` directory was created.** Nothing needs shared
schemas yet; product, checkout, custom-request and admin validation all arrive
with the features that use them. Creating the directory now would mean
committing placeholder files, which the brief forbids. The _decision_ — zod,
used consistently, validated server-side on every mutation — is the Phase 1
deliverable, and `src/lib/env/schema.ts` is its first instance.

---

## D1.7 — Prisma 7 pinned, and it changes the setup materially

**The `latest` dist-tag for `prisma` is a release candidate** (8.0.0-rc.12)
while `@prisma/client@latest` is 7.10.0 stable. Installing both unpinned
produces a mismatched CLI/client pair running an RC. Both are pinned to
**7.10.0**.

Prisma 7 departs from what ARCHITECTURE §5 assumed:

| ARCHITECTURE §5 assumed                             | Prisma 7 actually requires                                                                                        |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `url = env("DATABASE_URL")` in the datasource block | `url` is rejected there; CLI connection config moves to `prisma.config.ts`                                        |
| Client connects via an embedded query engine        | Client connects through a **driver adapter** (`@prisma/adapter-pg`, which bundles `pg`)                           |
| `.env` auto-loaded by the CLI                       | No auto-load; `prisma.config.ts` calls Node's built-in `process.loadEnvFile`, so no `dotenv` dependency is needed |
| Client generated into `node_modules`                | Generated into `src/generated/prisma`, which is git-ignored and excluded from lint and Prettier                   |

`directUrl` is **not** configured yet. It matters only for pooled production
connections, which belong with the managed-host decision (TBD.md I3, Phase 9).

`postinstall` runs `prisma generate`, because the generated client must exist
before `tsc` runs — in CI as well as locally.

---

## D1.8 — Docker Compose needs an explicit project name

Compose derives its project name from the directory name. This directory is
`אתר חנות תכשיטים`, which normalises to an empty string, and **every Compose
command fails** with `project name must not be empty`.

`docker-compose.yml` therefore sets `name: jewelry-store` explicitly. This is a
second consequence of the Hebrew path, after the OneDrive question in D0.3.
Node, npm, Next.js, Prisma and Vitest all handle the path correctly; Compose
was the only tool that did not.

Postgres 16 is initialised with `--locale=C` so index ordering and `ORDER BY`
do not depend on the host locale. Credentials are development-only and are
committed deliberately, so `npm run db:up` needs no setup.

**The host port is 5433, not 5432.** The first `db:up` on this machine failed
with `Bind for 0.0.0.0:5432 failed: port is already allocated` — another
project's Postgres container held it. A machine with a system PostgreSQL
install hits the same thing. A dedicated host port means this project starts
regardless of what else is running; the container still listens on 5432
internally, and `DATABASE_URL` in `.env.example` matches.

---

## D1.9 — Testing: no DOM, on purpose

`environment: 'node'`. The highest-value tests here are money, pricing,
inventory and validation (ARCHITECTURE §15), none of which need a browser. The
one component contract worth asserting — `<Bidi>` — is checked through
`react-dom/server`, which also needs no DOM. jsdom is therefore not a
dependency, and every run avoids paying for it.

Vitest needs `esbuild.jsx: 'automatic'` because tsconfig sets `jsx: "preserve"`
for Next.js, and Vitest has no downstream transform to hand preserved JSX to.

The Prisma schema test shells out to `prisma validate` rather than
re-implementing its rules. It catches what a type check cannot: a schema that
parses but is semantically broken.

---

## D1.10 — `lib` raised to ES2023, for exact currency formatting

`tsconfig.json` sets `lib` to ES2023 so `Intl.NumberFormat#format` accepts a
decimal _string_ (Intl V3). Without it the only typed input is `number`, which
would reintroduce floating point at the last step of a pipeline built
specifically to avoid it. `target` stays ES2022; Next.js transpiles by
browserslist regardless.

---

## D1.11 — What Phase 1 deliberately does not contain

No business models, no migration, no seed script, no storefront, admin,
catalog, cart, checkout, auth or payment code. No `components/` directory —
nothing has a component to put in it yet. No integration ports: they are Phase
2 and later, and a port with no provider gets no implementation (Rule 5).

`src/lib/db` and `src/lib/env` are not yet imported by any page. That is
expected: they are this phase's deliverables, they are covered by tests, and
Phase 2 is what consumes them.
