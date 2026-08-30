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

---

# Phase 2B — decision record

The production data model: Prisma schema, first migration, database
constraints, inventory reservation, validation schemas and domain tests. Still
no admin UI, storefront, checkout, payment or authentication screens.

Implements the recommendations in
[DATA_MODEL_REVIEW.md](DATA_MODEL_REVIEW.md), whose findings are referenced
below as **F1**–**F26**.

---

## D2.1 — 38 models, and why two exceed the review's list

The review approved 36 models for this phase. Two more were added:

- **`DiamondCertificate`**, split out of `DiamondSpec`. A certificate belongs to
  a _physical stone_ and is usually unknown when a product is created — a
  made-to-order piece is certified after production. Separating it means a
  product-level `DiamondSpec` (shared defaults across six gold variants) carries
  no certificate, while a variant-level spec can.
- **`OrderAddress`**, instead of eight shipping columns on `Order`. Keeps the
  order's money columns legible and makes adding a billing address a row rather
  than a migration. Only `SHIPPING` is collected today; §23 asks for no billing
  address.

`ProcessedWebhookEvent` remains deferred to Phase 6b, per the review: no payment
provider is chosen (TBD.md **B1**), so there is nothing to deduplicate yet.

---

## D2.2 — Public order numbers are sequence-backed

**`Order.orderNumber` is an `Int` with a database default of
`nextval('order_number_seq')`.** It is entirely separate from `Order.id`, which
is a cuid and is never exposed.

Why a sequence, specifically:

- **It is concurrency-safe.** `nextval` never returns the same value twice, and
  it does not read existing rows. `COUNT(*) + 1` and `MAX(...) + 1` both race
  under concurrent checkout and issue duplicates.
- **It cannot be forgotten.** As a _column default_ rather than application
  code, an order created by a script, a test or a future code path still gets a
  valid number.
- **It survives rollback correctly.** A sequence does not roll back, so an
  abandoned transaction leaves a gap rather than a collision. Gaps are
  acceptable; duplicates are not. Asserted by a test.

Sequences start at **100001** (orders) and **500001** (custom requests), in
separate number spaces, so the first order does not read as "order 1".

**Display formatting lives in `src/lib/orders/order-number.ts` and nowhere
else.** Nothing persists a formatted string, so the visual format can change
without touching stored data.

**Known tradeoff, accepted:** a monotonic sequence leaks order volume to anyone
who places two orders. TBD.md **B22** wanted a non-sequential-looking reference;
this phase's brief explicitly accepted a sequence-backed integer instead. If it
later matters, `ALTER SEQUENCE ... INCREMENT BY n` or a format change addresses
it without a data migration.

---

## D2.3 — One coupon per order. No stacking.

Decided for MVP, closing the neutral position the review recommended in F11.
Enforced in **three** places, not one:

1. `Cart.couponId` is a single nullable FK, not a join table.
2. `Order.couponId` is a single nullable FK.
3. **`CouponRedemption.orderId` is `UNIQUE`** — the database refuses a second
   redemption against the same order.

The third is what makes it real: application logic can be bypassed, a unique
index cannot. A test asserts that a second redemption on one order is rejected.

`Coupon.timesUsed` was **removed** (F10). Usage is derived from
`CouponRedemption` rows, which are the authoritative record. Two sources of
truth for the same fact is how a coupon gets honoured past its limit. The
redemption FK to `Coupon` is `Restrict`, not `Cascade`: the row carries
`amountAgorot`, the discount actually granted, which is financial history.

`CouponTarget` replaces the `String[]` arrays (F13), so targeting has real
foreign keys and archiving a product cannot leave dangling ids.

---

## D2.4 — Per-customer coupon limits are best-effort for guests

**Stated plainly because it cannot be fixed, only bounded.**

Every guest checkout creates a _new_ `Customer` row — that is the design that
makes guest checkout structural (§24), not a bug. So a per-customer limit keyed
on `customerId` is unenforceable for guests: a shopper can reuse a
one-per-customer coupon indefinitely by checking out as a guest each time (F12).

**What was done:** `CouponRedemption.customerEmailNormalized` is stored and
indexed, and the usage check matches on it as well as on `customerId`. A
returning guest using the same email is caught.

**What was deliberately NOT done:** device fingerprinting, IP tracking, or any
other invasive identification. It would be a privacy decision nobody has made,
it is trivially defeated, and §48 and the legal items in TBD.md point the other
way.

**The honest position:** a per-customer limit is a deterrent against casual
reuse, not a guarantee. A coupon whose abuse would genuinely hurt should use
`usageLimitTotal`, which _is_ enforceable, or be issued as single-use codes.
This should be said out loud to whoever configures a coupon.

---

## D2.5 — Typed-first attributes. No EAV.

Implemented as the review recommended (§8 of DATA_MODEL_REVIEW), and the balance
turned out even more typed than expected:

| §10 filter                                 | Where it lives                               | Typed?        |
| ------------------------------------------ | -------------------------------------------- | ------------- |
| Gold karat, gold colour                    | `ProductOption` / `ProductOptionValue`       | Relational    |
| Ring size, length                          | `ProductOption` (axis or selection, per B11) | Relational    |
| Diamond shape, carat, colour, clarity, cut | `DiamondSpec`                                | Typed columns |
| Price                                      | `Product.min/maxPriceAgorot`                 | Typed         |
| Availability                               | derived from `Inventory`                     | Computed      |
| **Style, pendant type**                    | `Product.attributes` (JSONB)                 | JSON          |

So the JSON bag carries **two** facets. Three rules keep it from degrading into
an unqueryable junk drawer:

1. Allowed keys per category are declared in `Category.filterConfig` and
   validated server-side. A key not declared for the category is rejected.
2. Scalars and scalar arrays only — no nesting, because nested JSON is not
   usefully indexable.
3. A GIN index with `jsonb_path_ops` covers containment queries
   (`attributes @> '{"style":"vintage"}'`), which is the only access pattern
   this column has.

Promoting a JSON key to a typed column later is an additive migration plus a
backfill — a half-hour job at ~100 products. Retreating from EAV would be a
rewrite of every query. The cheap-to-reverse direction was chosen.

---

## D2.6 — Constraints live in the database, in raw SQL

**35 CHECK constraints**, plus a `NULLS NOT DISTINCT` index, two sequences and
three operator-class indexes, are hand-written SQL inside the migration.

Prisma's schema language expresses unique constraints and foreign keys. It
expresses **neither CHECK constraints nor `NULLS NOT DISTINCT`** — verified
against Prisma 7.10, where `@@unique([...], nullsNotDistinct: true)` fails with
`No such argument`.

The principle: **an invariant that must never be violated belongs in the
database.** Application checks exist to produce good error messages; they are
not the guarantee, because they are bypassed by every seed script, admin
fix-up, backfill and concurrent request.

The single most valuable one:

```sql
ALTER TABLE "Order" ADD CONSTRAINT "Order_total_consistent"
  CHECK ("totalAgorot" = "subtotalAgorot" - "discountAgorot" + "shippingAgorot");
```

It is the last line of defence against a pricing bug shipping money out of the
door, it costs nothing, and it catches mistakes no unit test anticipated. VAT is
deliberately **not** in that equation: Israeli consumer prices are displayed
VAT-inclusive (ARCHITECTURE §6.2), so `vatAmountAgorot` is a component _of_ the
total, recorded for the invoice, not an addition to it.

The canonical line formula is fixed by constraint too, so every writer agrees:

```
lineTotal = (unitPrice + personalization) * quantity - lineDiscount
```

`personalizationAgorot` is a **per-unit** surcharge (F15).

**The migration is hand-edited and must not be regenerated.** Re-running
`prisma migrate dev --create-only` over it would drop every one of these. A
banner at the top of the file says so.

---

## D2.7 — Wishlist uniqueness needs `NULLS NOT DISTINCT`

PostgreSQL treats NULLs as **distinct** in unique indexes by default, so
`@@unique([wishlistId, productId, variantId])` with a nullable `variantId` let a
product-level favourite be inserted an unlimited number of times (F9).

The migration creates the index with `NULLS NOT DISTINCT` (PostgreSQL 15+)
instead, which matches the intended business semantics: a product may appear on
a wishlist **once generally, and once per variant**.

**No `@@unique` is declared in `schema.prisma` for this**, deliberately —
declaring one would create a second, broken index alongside the correct one. The
model carries a comment saying so, because the absence is otherwise easy to
mistake for an oversight.

---

## D2.8 — Prisma client is generated with explicit `.ts` import extensions

`generator client` sets `importFileExtension = "ts"`.

Without it the generated client imports its own modules extensionlessly
(`./enums`), which Node's ESM resolver cannot follow when running a TypeScript
file directly — `node prisma/seed.ts` fails with `ERR_MODULE_NOT_FOUND`.
Bundlers resolve either form, so nothing else is affected.

This is what lets the seed run on **Node's native type stripping** with no
TypeScript runner dependency at all. `tsconfig.json` gains
`allowImportingTsExtensions: true`, which is safe here because `noEmit` is on
and Next.js does the compiling.

---

## D2.9 — Inventory: reservations own the counter

The review's F7 finding, implemented.

`Inventory.reserved` is no longer a bare counter. Every reserved unit is owned
by an **`InventoryReservation`** row with a status
(`ACTIVE | RELEASED | CONSUMED | EXPIRED`) and an `expiresAt`, so the system can
say which checkout holds it, release it when it expires, and reconcile after a
crash. Without that, `reserved` ratchets upward on every abandoned payment and
stock silently disappears — a test asserts exactly that failure mode is fixed.

**The concurrency strategy is a single conditional UPDATE:**

```sql
UPDATE "Inventory" SET "reserved" = "reserved" + $qty
 WHERE "variantId" = $id
   AND ("policy" = 'MADE_TO_ORDER' OR "onHand" - "reserved" >= $qty)
```

Under READ COMMITTED, a second transaction that blocks on the row lock
**re-evaluates its WHERE clause against the committed new row version** once the
lock is released. It therefore sees the incremented `reserved`, the condition
fails, and it affects **zero rows** — which is the failure signal. No
`SELECT ... FOR UPDATE`, no advisory lock, no retry loop.

A read-then-write sequence would be a lost-update race: both buyers read
`available = 1`, both decide yes, both write. Tests cover two concurrent buyers
for one unit and twenty concurrent buyers for five units.

`Inventory_deny_cannot_oversell` is the backstop: even bypassing this module
entirely, the database refuses to record an oversold state. Also asserted by a
test.

`releaseReservation` and `consumeReservation` are **idempotent** — the status
transition is a conditional `updateMany` on `status = 'ACTIVE'`, so a duplicate
call affects zero rows and returns `false` rather than double-crediting stock.
That matters because payment webhooks are retried.

**`InventoryMovement`** is an append-only ledger recording both `onHandDelta`
and `reservedDelta` plus the resulting state, so a stock discrepancy is always
explainable. It is never updated or deleted.

---

## D2.10 — Historical integrity is enforced, not merely intended

Three layers, in order of trust:

1. **Typed snapshot columns on `OrderItem`** — the order page and invoice render
   from these. Typed so they stay queryable for reporting.
2. **Self-describing JSON snapshots** — `customization`, `selections`,
   `diamondSnapshot`, `productSnapshot`, for shapes that are per-product.
3. **Soft FKs** (`productId`, `variantId`) with `onDelete: Restrict` — reporting
   joins only, never read for display.

The F14 repair matters most. `OrderItem.customization` is an **array of
`{ key, labelHe, fieldType, value, valueLabelHe?, position }`**, never a
`{ key: value }` map, because labels change, fields get deleted, SELECT values
are codes, and order matters. A value with no label is not a record of what the
customer chose.

Two tests hold this: one renames, deletes and reorders customization fields and
asserts the order renders identically; another renames, reprices and archives
the product and asserts every snapshot column is untouched.

`onDelete: Restrict` on `OrderItem → Product` and `Order → Customer` is the
database backstop behind the admin UI offering "Archive", never "Delete"
(principle 12). A test asserts both deletions are refused.

---

## D2.11 — Tests run against a real PostgreSQL

Integration tests use a **separate `jewelry_test` database**, created and
migrated by a Vitest `globalSetup`.

**`prisma migrate deploy`, not `db push`.** This is the important part: the
tests exercise the _actual migration_, including all the hand-written raw SQL. A
schema pushed from `schema.prisma` would silently omit every CHECK constraint
and the wishlist index, and every constraint test would pass against a database
production will never resemble.

`fileParallelism: false`, because integration tests truncate shared tables. The
suite is small; serial execution costs seconds and removes a class of flakiness.

**`npm test` now requires a running database** (`npm run db:up`). Tests fail
loudly when it is missing rather than silently skipping — a silently skipped
concurrency test is worse than no test at all. CI runs a PostgreSQL service
container for the same reason.

---

## D2.12 — What Phase 2B deliberately does not contain

No admin UI, storefront, product page, cart UI, checkout UI, payment provider,
invoice provider or authentication screens. No `ProcessedWebhookEvent`. No
automatic collection rules — `Collection.isAutomatic` and `rules` exist and stay
unused until TBD.md **B15** is decided.

The auth _tables_ exist (`User`, `Account`, `Session`, `VerificationToken`) with
`passwordHash` documented as Argon2id and never plaintext, but no authentication
logic and no provider secrets. `Customer.userId` stays nullable, which is what
makes guest checkout structural rather than a special case.

---

# Phase 3A — decision record

Storefront foundation: header, navigation, homepage, category shell, product
card. Browsing structure exists; nothing can be bought, searched or saved.

---

## D3.1 — Navigation state is a pure reducer, not component state

The header owns four interacting pieces of state: the open mega menu, the mobile
drawer, the drawer's expanded group, and the search overlay. They constrain each
other — **at most one overlay surface may be open at a time**, because each one
claims the viewport and the user's focus.

Expressed as four `useState` calls, that invariant becomes scattered
`setX(false)` calls that drift apart, and testing it requires a DOM this project
deliberately does not have (D1.9).

It is therefore a pure reducer in `src/lib/navigation/menu-state.ts`, and the
invariant is asserted directly — including a property-style test that checks
**every prefix** of an action sequence, not just the final state.

That test earned its place immediately: it caught `OPEN_MEGA_MENU` closing the
search overlay but not the mobile drawer. Harmless in practice, since the two
never share a viewport, but it meant the invariant was being enforced by CSS
breakpoints rather than by the reducer.

---

## D3.2 — The mega menu trigger is a button, not a link

A control that expands a panel is a button. Announcing it as a link and then not
navigating misrepresents it to a screen reader.

The category landing page is not lost: **"כל הטבעות" is the first link inside
every panel**, which is also the more discoverable position. A test asserts that
every mega menu opens with a link to its own category, because losing it would
strand the category with no route to it.

---

## D3.3 — The mobile drawer has no entry animation

A slide-in keyframe was implemented, then removed.

The drawer's resting position is correct on its own (`start-0`). A slide makes
the animation the _only_ thing that brings it on screen: it starts translated a
full width away and depends on the animation clock to return it. Observed
directly in testing, an animation whose clock does not advance — a throttled or
background-rendered tab — leaves the drawer parked off-screen while body scroll
is locked. That presents as a completely broken page.

The specification asks for restraint over motion (§2) and the phase brief asked
for a simple, reliable drawer, so the trade was easy: no motion, and the failure
mode disappears.

---

## D3.4 — Low-stock UI is a prop, never a rule

`ProductCard` accepts an optional `stockNotice` string and renders nothing when
it is absent. There is **no client-side threshold**, no `lowStockThreshold` prop,
and no `if (quantity < 3)` anywhere in presentation.

Scarcity is a claim about real inventory. Deciding it belongs to
`src/lib/inventory` against real stock, not to a component that could invent it.
The development fixtures carry no stock values at all, and a test asserts a card
with no inventory data says nothing about inventory.

---

## D3.5 — No fabricated reviews, and no fabricated contact details

Most placeholders in this phase stand in for creative that does not exist yet. A
fake customer review is a different category of thing: it is a false statement
attributed to a person, it is exactly what the section would display in
production, and a fabricated testimonial is a consumer-protection problem rather
than a design shortcut.

`ReviewsSection` therefore renders the layout — three cards at the right
proportions, star row and attribution line positioned — with an explicit empty
state. The same reasoning applies to the footer contact channels, which show
"יעודכן" with no `href` rather than an invented phone number or a dead `tel:`
link.

---

## D3.6 — Desktop navigation fits 1024 by shrinking, not by collapsing

At 1024px the eight primary items, wordmark and four utility controls overflowed
by 111px. The easy fix — moving the hamburger breakpoint up to `xl` — was
rejected: §6 states twice that desktop must not use a hamburger, and 1024 is a
genuine laptop width.

Instead the nav tightens (`px-2`, no inter-item gap, wider gutter deferred to
`xl`) and the primary label shortened to "מדריכים"; the page itself keeps the
full "מדריכים ושאלות נפוצות" title. Measured at 375, 768, 1024, 1280 and 1440:
**zero horizontal overflow at every one**.

---

## D3.7 — Placeholders are registered and greppable

Every temporary surface marks itself with `data-placeholder` and is listed in
`src/lib/placeholders.ts` with the phase that replaces it. The full set is
findable from source _and_ from a running page
(`document.querySelectorAll('[data-placeholder]')`).

The risk being managed is a placeholder quietly surviving into production
because nobody remembered it was one. When that file is empty, the shell is
fully wired.

---

## D3.8 — Fixtures are read by routes, never imported by components

`src/lib/fixtures` is development data with its own README stating the rules. No
component imports it; routes read it and pass it down. Phase 3B replaces one
import per route with a query, and no component changes.

---

## D3.9 — What Phase 3A deliberately does not contain

No working search, cart, wishlist, account, authentication, checkout or
filtering. No pagination and no SEO copy on category pages — both are meaningless
against a fixed fixture array, and a paginator over eight hard-coded products
would be a fake control. No product gallery or variant selection (Phase 4). No
custom-request form: it would collect a name, phone and reference photo and
discard them, which is worse than no form.

No brand decisions. The wordmark is plain type, the palette and font remain the
provisional ones from Phase 1, and all photography is a tonal placeholder
surface. Nothing here should be read as a settled identity.

---

# Phase 3A — amendments after design review

Six owner requests, three of which reverse decisions taken earlier in the same
phase. The originals are left in place above rather than edited, so the
reasoning that turned out to be wrong stays visible.

---

## D3.10 — The mega menu trigger navigates (reverses D3.2)

D3.2 made the trigger a `<button>`: a control that expands a panel is a button,
and "כל הטבעות" inside the panel carried the route to the category.

Correct in the abstract, wrong in use. Clicking a category name is the most
obvious thing a visitor does, and swallowing that click to toggle a panel is a
dead end — worst of all with a mouse, where hover has _already_ opened the
panel, so the click appears to do nothing at all.

The trigger is now an `<a>` to the category. The panel opens on hover **and on
focus**, so keyboard users still reach it by tabbing; `aria-expanded` stays on
the link, which ARIA 1.2 supports on `role=link`; Escape still closes and
restores focus.

The mobile drawer got the same treatment, as a **link plus a separate chevron
button**. On a touchscreen there is no hover, so one control cannot both
navigate and expand — splitting them is the only way both stay reachable. Each
carries its own accessible name.

---

## D3.11 — Filters are opt-in, not a permanent sidebar

The pinned filter sidebar was the conventional catalog layout and the wrong
call: it spent a quarter of the page on controls most visitors never touch, and
squeezed the product grid — the actual content — into what was left.

Filters now open from a toolbar toggle, closed by default, in two
presentations from one state: **desktop opens a panel downward** in the page
flow above the grid, laid out in columns, so nothing overlaps the products;
**mobile opens a side drawer**, because a top panel on a phone would push the
products off-screen entirely. The grid runs full width — measured 1056px at
1280, against roughly 790px before.

---

## D3.12 — Headings are centred where the section is full-width, not everywhere

The reviewer found headings pinned to the inline-start edge uncomfortable. That
is a real effect and worse in RTL: a short Hebrew title jammed against the heavy
right margin, with the paired "see all" link stranded at the far left of the
same row, forces the eye across the full page width to read one heading.

Centred: page heroes (title, introduction and breadcrumbs), full-width homepage
section headings, subcategory chips from `md` up. The "see all" link moved
below the heading rather than opposite it.

Left start-aligned, deliberately:

- **breadcrumb trails** — a centred trail is genuinely hard to read;
- **two-column editorial bands** — centring short text inside a narrow column
  looks accidental, and the alternating image sides already give the rhythm;
- **the product page title** — it heads a column of controls that are
  themselves start-aligned;
- **footer columns and the FAQ list** — long-form reading and link lists both
  want a consistent start edge.

Verified by measurement: the five full-width section headings sit at centre
offset 0; the three editorial headings at ±280px, alternating.

---

## D3.13 — Every inner page opens with a hero band

`PageHero` puts breadcrumbs, title and introduction centred over an image band
on category, FAQ, contact, custom and the placeholder routes. It reuses the same
tonal `PlaceholderImage`; the photography is still TBD and this is a frame
waiting for it.

`PlaceholderImage` gained `hideLabel`, because its centred caption chip landed
directly behind the centred hero title and the overlap read as a rendering
fault.

---

## D3.14 — Gifts removed, Guides became FAQ, Contact promoted

Three departures from the section 6 navigation list, all owner decisions:

- **Gifts removed for now.** It is a merchandising surface with no products
  behind it; an empty category is worse than an absent one. The
  `?collection=gifts` discovery links went with it. A test asserts no `gifts`
  href survives anywhere in the taxonomy.
- **Guides became "שאלות ותשובות" at `/faq`.** The section 33 educational
  articles are still unwritten, and shipping invented jewellery advice has a
  real cost — wrong ring-sizing guidance misleads a buyer. Questions with a
  checkable factual answer are answered; questions whose answer is an unset
  business policy (shipping cost, return window, warranty length — TBD L2, L3,
  L4, B4, B5) are listed and explicitly marked pending rather than invented.
- **Contact promoted to primary navigation.** Section 51 puts contact in the
  footer only, but a store taking custom orders is asked questions before it is
  asked for a checkout.

The contact page carries **no invented details and no form**. Channels render
"יעודכן" with no `href`, from the same constant the footer reads. A contact form
would collect a name, phone and message and discard them — there is no inbox
behind it — and a form that silently drops enquiries is worse than no form,
because the customer believes they have been in touch.
