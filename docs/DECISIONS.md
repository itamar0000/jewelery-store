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

---

# Phase 3B-1 — decision record

Catalog integration. The storefront now reads PostgreSQL; the development
fixtures are deleted.

---

## D3B.1 — `src/lib/catalog` is the only place Prisma is touched

Routes call query functions and receive VIEW MODELS (`src/lib/catalog/types.ts`);
no component imports `@/lib/db`. Three properties fall out of that boundary:

- money is `Money` (integer agorot) rather than a raw number a component might
  format by hand;
- availability is the resolved object from `@/lib/inventory`, never a display
  string — the schema is explicit that availability is derived, never stored;
- a schema change is absorbed by the mappers instead of rippling into JSX.

Visibility is enforced in ONE place: an `activeProduct` predicate spread into
every product query. Repeating `isActive / publishedAt / archivedAt` per call
site is how one eventually gets forgotten and a draft reaches a customer. Tests
assert drafts, inactive and archived products are invisible on every path.

---

## D3B.2 — Category slugs are real, so the seed's demo markers move to products

Every other seeded row carries a `demo-` marker. Categories cannot: a category
slug IS its route, so the row must be `rings` or `/rings` 404s. "טבעות" is also
not fabricated business data — it is the taxonomy from specification section 5.

The fabrication lives in the products, and that is where the markers stay:
`DEMO-` SKUs, `demo-` slugs, and a Hebrew demo notice opening every short
description.

_Superseded in part by D4D.1: the product markers came off once the owner
confirmed the pieces are real, manufacturable models._

Subcategory slugs are globally qualified — `diamond-rings`, not `diamond` —
because `Category.slug` is unique table-wide and "diamond" would otherwise
collide across rings, earrings, necklaces and bracelets. The navigation hrefs
were updated to match.

---

## D3B.3 — `loading.tsx` was removed: it produced soft 404s

The first implementation added a `loading.tsx` to each catalog route. That was
wrong, and the failure is invisible in the browser.

A `loading.tsx` wraps the WHOLE segment in Suspense, so Next begins streaming —
and commits HTTP **200** — before the route body runs. A later `notFound()` then
renders the not-found UI _under that 200_: a soft 404. A crawler indexes
`/product/anything` as a real page.

Measured against a production build:

| URL                     | with `loading.tsx` | without |
| ----------------------- | ------------------ | ------- |
| `/product/nope`         | 200                | **404** |
| `/rings/does-not-exist` | 200                | **404** |
| `/collections/nope`     | 200                | **404** |

The fix keeps both properties: the route awaits the category or product FIRST,
so a missing one 404s before anything is sent, and only the product results
stream, behind an explicit `<Suspense>` inside the page
(`CategoryResults`). The skeleton survives; the soft 404 does not.

---

## D3B.4 — Catalog routes are dynamic, including the homepage

The homepage initially built as `○ (Static)`: Next prerendered it and baked the
best-seller list into HTML at build time. The owner edits the catalog through
the admin, so that snapshot would go stale immediately and stay stale until the
next deploy.

All catalog routes are now server-rendered per request. A real cache policy —
incremental revalidation with a chosen window — is a deliberate decision for
3B-2, not something to inherit from what Next happened to be able to analyse
statically.

---

## D3B.5 — Images are real rows without bytes

`ProductImage.storageKey` is a key, not a URL, because the storage provider is
undecided (TBD.md I1). `resolveImageUrl` therefore returns `null` for every key
today and the gallery falls back to the tonal placeholder.

What is genuinely real is everything else: the rows, their alt text, their
ordering, and their variant association. So the gallery really does query
images, really does prefer a variant's images over the product's, and really
does re-resolve on a variant change. Changing gold colour visibly changes the
caption — which demonstrates the wiring honestly, without inventing photography.
When a provider lands, one function starts returning URLs and nothing else
changes.

---

## D3B.6 — Low-stock messaging is now real, and D3.4 still holds

Phase 3A made `stockNotice` a prop with no default and no client-side rule,
noting that only a caller holding real inventory could supply one. That caller
now exists: `toProductCard` emits a notice only when `resolveAvailability`
reports genuine low stock, which itself requires a configured threshold.

The component still invents nothing. A product with no threshold says nothing
about stock, and a missing inventory row fails CLOSED — treated as zero on hand
rather than available, because showing an unstocked item as purchasable is the
expensive direction to be wrong in. Both are asserted by test.

---

## D3B.7 — Axis options change the variant; selections do not

`ProductOption.isVariantAxis` splits the product page in two. Gold colour and
karat are AXES: the selected combination identifies one variant, matched on SET
equality of option value ids — a subset match would return the wrong SKU, and
therefore the wrong price and the wrong stock. Ring size and length are
SELECTIONS recorded for the eventual order line; they deliberately do not change
the variant, because a made-to-order piece is not stocked per size (TBD.md B11).

Prices, stock and images are all computed on the server and passed down. The
client component receives a resolved object and queries nothing, which is what
makes "do not trust client-provided prices" structural rather than observed.

---

# Phase 3B-2 — decision record

Catalog discovery: URL-driven filters, database sorting, pagination.

---

## D3B2.1 — The URL is the only filter state

There is no `useState` holding a selection, no effect syncing state into the
address bar, and no "apply" button. Every filter value renders as a `<Link>` to
the URL that toggling it produces.

That is what makes reload, back, forward and a pasted link behave identically —
by construction rather than by careful synchronisation, which is the usual way
this breaks. The only local state in the filter UI is whether the panel is open,
which is presentation.

Parameter contract, documented in `src/lib/catalog/filters.ts`:

| Parameter              | Values                                                 |
| ---------------------- | ------------------------------------------------------ |
| `minPrice`, `maxPrice` | whole **shekels**, not agorot — a URL a human can read |
| `karat`                | `14k`, `18k`                                           |
| `goldColor`            | `yellow`, `white`, `rose`                              |
| `ringSize`             | `48`, `50`, `52`, …                                    |
| `length`               | `40cm`, `45cm`, …                                      |
| `shape`                | `round`, `oval`, …                                     |
| `carat`                | `0-0.5`, `0.5-1`, `1-2`, `2-plus`                      |
| `style`, `pendantType` | `classic`, `modern`, `name`, …                         |
| `sort`                 | recommended, newest, price-asc, price-desc             |
| `page`, `pageSize`     | integer; 12, 24 or 48                                  |

Multi-value facets are comma-separated (`?goldColor=white,rose`); repeated keys
are also accepted because that is what a checkbox form submits, and both
normalize to one canonical URL. Defaults are never emitted — no `?page=1`, no
`?sort=recommended` — so one state has exactly one URL.

---

## D3B2.2 — Validation is two-stage, and the second stage is the real one

1. `parseCatalogSearchParams` shape-checks with zod. Every field catches to a
   default: a malformed `?page=abc` is a shared link or a crawler, not an
   exception, so it normalizes to page 1 rather than throwing a 500.
2. `normalizeCatalogQuery` intersects every token with the **real facet values
   read from the database**, and drops what does not match.

Stage 2 is what makes "invalid parameters are safely ignored" structural: no
caller-supplied string reaches Prisma unless it already exists in the catalog.
It is also what makes category-awareness structural — a necklace category has no
`ring_size` facet, so `?ringSize=52` is dropped before it can filter anything,
and no component contains a category conditional.

A reversed price range is swapped rather than returning nothing, and a token
list is capped at 24 so a hand-edited URL cannot become an unbounded IN clause.

---

## D3B2.3 — Two filter predicates that are easy to get wrong

**Axis filters must match the SAME variant.** "18K" and "white gold" as two
separate `variants: { some: ... }` clauses means _has an 18K variant AND has a
white variant_ — which matches a ring offering 18K-yellow and 14K-white and no
18K-white at all. They are combined inside one `some`, so a single purchasable
variant satisfies every axis. Asserted by test: white + 14K returns 0 in a
fixture where white is always 18K.

**Price is an overlap, not a containment.** A product whose variants run
4,890–5,890 must appear in a 5,000–6,000 search, so the test is range
intersection against the denormalized `minPriceAgorot` / `maxPriceAgorot`
columns the schema maintains for exactly this.

Non-axis options (ring size, chain length) are matched at PRODUCT level, because
they are selections recorded on the order line rather than stocked SKUs — there
is no variant carrying them.

---

## D3B2.4 — Sorting happens in PostgreSQL, and every mode has a unique tiebreak

All four modes end with `id: 'asc'`. Without a unique tiebreak two products with
the same price have no defined relative order, and PostgreSQL may return one of
them for both OFFSET 0 and OFFSET 12 — showing a product twice on one page and
never on the other. The tiebreak is what makes "no duplicates, no missing
products" true rather than usually true.

Price sorts on `minPriceAgorot` in **both** directions, because that is the
figure the card displays; sorting descending on `maxPriceAgorot` would order by
a number the customer never sees.

**"Recommended" is a placeholder rule and the business definition is TBD.**
Today: products the owner has curated into collections first (ordered by how
many collections they appear in), then newest, then id. That uses only real
merchandising data the owner already maintains, it is deterministic, and it is
genuinely different from "newest" rather than a second name for it. When a real
rule exists — margin, stock cover, conversion — `buildCatalogOrderBy` is the
single place it lands.

---

## D3B2.5 — Offset pagination, and the page is clamped rather than rejected

Offset, deliberately. At the ~100-product scale in the specification the
deep-offset cost that motivates cursor pagination does not exist, while offset
gives what this catalog actually needs: jumpable page numbers, a total count and
a shareable `?page=3`.

`?page=99` on a two-page result serves page 2. An empty page is a dead end that
looks broken, and clamping keeps a stale bookmark useful. Any filter or sort
change resets to page 1 — keeping the page strands the visitor on an empty
page 4 of a 2-page result.

---

## D3B2.6 — No indexes added, on the evidence

`EXPLAIN (ANALYZE, BUFFERS)` on the heaviest path — category rollup, price
range, price sort, limit:

```
Limit ... actual time=0.768..0.772 rows=3
  Sort  Sort Method: quicksort  Memory: 25kB
    Index Scan using "Product_archivedAt_idx"
      SubPlan: Bitmap Index Scan on "ProductCategory_categoryId_idx"
Execution Time: 0.932 ms   Buffers: shared hit=16
```

The category join already uses `ProductCategory_categoryId_idx`, and the price
sort is an in-memory quicksort over three rows. An index on `minPriceAgorot`
would not be chosen by the planner at this size and would be a guess about a
catalog that does not exist yet. **Adding none** is the honest reading of "add
only indexes justified by the actual access patterns"; re-run this EXPLAIN when
the catalog reaches a few thousand products.

---

## D3B2.7 — Caching: still none, deliberately

Catalog routes remain server-rendered per request.

The owner edits prices, stock, products and collections through the admin. Any
revalidation window is a window in which a customer can be shown a price that is
no longer offered or an item that is no longer in stock — and inventory is the
one field where being stale is actively harmful, because it is what a customer
relies on before adding to a cart.

At ~100 products the queries run in about a millisecond, so caching would trade
a real correctness risk for a saving that is not currently measurable. The
sequence when it is needed: cache the CATALOG shell (names, prices, images) with
a short window and keep availability uncached, rather than caching the page
whole. Documented here so the next phase starts from a decision rather than from
the default.

---

## D3B2.8 — Canonical URLs

- **Filters are refinements, not pages.** `?goldColor=white` canonicalises to
  the bare category. With nine facets the alternative is thousands of indexable
  URLs that are all subsets of one page.
- **Pagination is not a refinement.** Page 3 holds different products, so it is
  self-canonical and keeps `?page=3`. Collapsing pages onto page 1 would tell a
  crawler that products only reachable on page 3 do not exist.
- **Sort is a refinement of ordering**, same products in a different order, so
  it is dropped from the canonical.

Nothing further: no per-combination titles, no synthetic descriptions.

---

## D3B2.9 — filter-config.ts deleted

The hard-coded per-category facet table from Phase 3A is gone. Which facets a
category offers now comes from `Category.filterConfig` (data — a row edit, not a
deployment), and which VALUES appear comes from the catalog itself, so a colour
nobody stocks is never offered as a filter that returns nothing.

---

# Phase 3C — decision record

Production search: pg_trgm behind the `SearchProvider` port, integrated into the
existing catalog listing rather than beside it.

---

## D3C.1 — The provider returns IDS, not products

This is the decision that stops search becoming a second catalog.

`SearchProvider.searchProductIds` returns ranked ids. Those flow into the
EXISTING `getCatalogPage`, which already applies filters, sorting, pagination
and the product-card shape. Search contributes relevance and nothing else, so
`/search?q=טבעת&goldColor=white&sort=price-asc&page=2` works with the machinery
Phase 3B-2 already built and tested — no parallel filtering with subtly
different semantics.

A future provider — vector, hosted — implements the same port and inherits all
of it.

---

## D3C.2 — Trigrams, because PostgreSQL has no Hebrew configuration

ARCHITECTURE section 9 states it: no Hebrew stemmer, no stop words, so
`to_tsvector('hebrew', …)` does not exist. Trigram similarity needs none of
that and handles partial words — "טבע" matching "טבעת" — which is exactly what
someone typing into an overlay produces.

Matching is **AND across typed terms, OR within a synonym group**. "טבעת זהב
לבן" requires all three concepts; a product matching only "זהב" is not a
result. Anything looser turns a three-word query into a catalog dump.

Raw SQL is used only here, because `similarity` and `word_similarity` have no
Prisma expression and relevance ordering must happen in the database. Every
value is a bound parameter via `Prisma.sql`; LIKE wildcards in user input are
escaped, so a query of `%` matches nothing rather than everything. Asserted by
test.

---

## D3C.3 — Ranking: per-term scoring, not just whole-query

The first implementation scored only the whole query — exact name, name
contains, whole-phrase similarity. It collapsed on real queries:

- `טבעת זהב לבן` scored **0 for every product**, because no name contains that
  phrase, so ordering fell through to the id tiebreak and was arbitrary.
- `טבעת אירוסין` put a bridal SET first, purely because its description
  contained the phrase, ahead of every actual engagement ring.

Each typed term now scores on its own, weighted by where it hits — the product
NAME counts three times what the document does, because a word in the name is
what the product _is_. Category relevance uses **trigram similarity, not
equality**, so "טבעת אירוסין" credits the category "טבעות אירוסין" despite the
plural; equality was the specific cause of the buried-engagement-rings bug.
Synonym hits score well below typed terms.

Weights are deliberately far apart rather than tuned: an exact name match must
outrank a description mention whatever the trigram numbers happen to be. Tuning
against a demo catalog would be fitting noise. Every mode ends with `id`, so the
order is total and pagination cannot repeat or drop a product.

---

## D3C.4 — Conservative normalization, curated synonyms

Normalization does four safe things: collapses whitespace, strips punctuation
shoppers type but products never contain, removes niqqud, and normalizes
geresh/gershayim to ASCII quotes. It does **not** stem, strip prefixes, or
transliterate — over-normalizing Hebrew damages real searches, and stripping the
definite article ה would turn "הלו" into "לו".

The synonym set is flat, small and readable, with rules stated in the file: only
terms a customer plausibly types, and never mapping two different products
together. Multi-word phrases resolve before single words, so "זהב לבן" is white
gold rather than the intersection of "gold" and "white". Expansion is capped —
every extra term makes the result set broader and the ranking mushier.

---

## D3C.5 — Search document: what is in it, and how it stays fresh

In: name, short description, trimmed long description, categories and their
parents, collections, gold option labels, diamond shape, lab-grown marker,
attribute values. Out: SKUs, prices, stock, ids, certificate numbers.

The exclusions are not tidiness. Trigram similarity is **inversely proportional
to document length**, so a longer document scores _worse_ — stuffing prices and
SKUs in would dilute every score and make the products harder to find. That is
also why the description is capped.

Freshness, without a queue or a trigger:

1. **Write path.** `buildSearchDocument` runs wherever a product is written.
2. **`npm run search:reindex`** rebuilds everything, covering what the write
   path cannot see: renaming a CATEGORY or COLLECTION changes the document of
   every product inside it.

One implementation, three callers (seed, CLI, provider) — an earlier draft had
the seed build documents inline and the provider build them again, which is how
a seeded catalog ends up indexed differently from a real one. The cost is stated
plainly: between a category rename and the next reindex, search matches the old
name. Bounded, one-command staleness, and asserted by test.

---

## D3C.6 — No new index; the existing trigram index is already correct

The GIN trigram index on `Product.searchDocument` was created in the initial
migration, alongside the `pg_trgm` extension. `EXPLAIN (ANALYZE, BUFFERS)` at 51
products:

```
Limit → Sort (quicksort, 25kB) → Seq Scan on "Product"
  Rows Removed by Filter: 51
Execution Time: 0.328 ms   Buffers: shared hit=15
```

The planner chooses a **sequential scan**, and that is correct: the whole table
is nine pages, so a GIN lookup would cost more than reading it. The index is
present and will be chosen as the catalog grows. Adding anything further now
would be optimising against a catalog that does not exist.

---

## D3C.7 — Two bugs the tests caught, both silent

**`categoryIds: []` matched nothing.** `/search` scopes to the whole catalog by
passing an empty category list, but `buildCatalogWhere` emitted
`primaryCategoryId IN ()` — a condition matching zero rows. Every search would
have returned no results while looking perfectly healthy. An empty list now
means "no category restriction", in both the filter predicate and the facet
scope.

**Search did not default to relevance.** `parseCatalogSearchParams` fell back to
`recommended` regardless of `q`, so `/search?q=צמיד טניס` sorted by
merchandising order and buried the exact match. The default now depends on the
query: relevance for search, merchandising order for a category listing —
resolved in one function so `buildCatalogHref` still omits the default from the
URL on both kinds of page.

---

## D3C.8 — Overlay is a shortcut, not a results page

At most five products and three categories, then a hand-off to `/search`. A
suggestion list that fills the viewport is a worse results page rendered in a
modal, competing with the page it exists to lead to.

Keyboard support follows the combobox pattern: the input keeps focus and owns
`aria-expanded` and `aria-activedescendant`; Down/Up traverse a flat list of
everything selectable, because that is what the eye sees; Enter follows the
highlight or submits the raw query; Escape closes. Requests are debounced and
each in-flight one is aborted on the next keystroke, so a slow response cannot
overwrite a newer one.

Prices are formatted **on the server**, through the money module — the overlay
never receives an agorot integer to format itself.

---

## D3C.9 — `/search` is noindex, and nothing is fabricated

A search results page is not content, and letting crawlers enumerate `?q=` fills
an index with junk URLs. `robots: { index: false, follow: true }`, canonical
`/search`.

The zero-result state says plainly that nothing matched and offers three real
routes onward: clear the search, try a suggested term, or browse a real
category — categories read from the database, so a suggestion never points
somewhere that does not exist. **No "similar" products are substituted.**
Showing items the shopper did not ask for is how a search stops being trusted.

---

# Phase 4A — decision record

Media storage foundation. Resolves TBD **I1**.

---

## D4A.1 — S3-compatible object storage, not Cloudinary

Full reasoning in [docs/MEDIA_STORAGE_DECISION.md](MEDIA_STORAGE_DECISION.md).
The three arguments that actually decided it, all specific to this project:

1. **We are building our own Admin.** Cloudinary's strongest differentiator is a
   media-library UI for non-technical users — but the owner will manage images
   beside the product they belong to, in our Admin. Sending them to a second
   system to manage the same assets is worse, not better.
2. **`next/image` already transforms.** Responsive `srcset`, AVIF and WebP ship
   with the framework this project already uses. Paying a second service to do
   the same job buys nothing here.
3. **Custom-request uploads are private customer files** (§17, §48). Presigned
   reads against a private prefix are S3's primary use case; on a
   transformation-first product they are the awkward path.

Portability was already designed in — the database stores keys, not URLs — so
the choice stays reversible. R2 is the recommended instance for zero egress
fees, but nothing in the code depends on it.

---

## D4A.2 — No transformation method on the interface

`MediaStorage` is `createUpload` / `delete` / `publicUrl` / `signedReadUrl`.

A `transform()` or `getVariantUrl()` was considered and rejected: it would
either duplicate `next/image`, or bind stored data to one vendor's URL syntax —
undoing the portability that keys-not-URLs was chosen for. One stored object per
image, with widths and formats derived at request time, also means deletion and
re-upload have nothing to keep in sync.

---

## D4A.3 — Storage is optional at runtime, and partial configuration is not

No bucket is provisioned. So with no `MEDIA_S3_*` variables the application
boots, the catalog renders, tests run, and images fall back to the placeholder
surface. Nothing pretends an upload happened.

A **partial** configuration behaves differently: it throws, naming the missing
variables. Half-set variables are a deployment mistake, and treating them as
"storage is off" would hide it until someone noticed images silently missing in
production. Error messages never contain a variable's value — asserted by test.

---

## D4A.4 — Keys are built from content type, never from the filename

The extension comes from the **validated content type**; the filename
contributes at most a cosmetic slug of `[a-z0-9-]`. That single choice removes
the entire class of `evil.php.jpg`, `../../etc/passwd` and RTL-override bugs,
rather than trying to escape them.

**SVG is refused**, not merely unsupported: it is executable markup, and serving
one from the asset origin is a stored-XSS vector. Accepted formats are JPEG,
PNG, WebP and AVIF.

Keys carry a random id, so re-uploading the same filename never overwrites an
existing object, and a `public/` or `private/` prefix that the bucket policy
keys on — which is what makes customer uploads private by construction rather
than by convention.

---

## D4A.5 — Presigned PUT, validated before signing

The browser uploads directly; bytes never pass through the Next.js server,
avoiding serverless body limits. The signature covers the key, the method, the
content type **and the declared length**, so a URL issued for one small JPEG
cannot be reused for something else or something larger — asserted against a
real endpoint.

Validation runs _before_ signing, because the signature **is** the
authorization: checking afterwards would check nothing.

---

## D4A.6 — MinIO in Compose, so the adapter is genuinely tested

MinIO speaks the S3 API, so the adapter is exercised against a real endpoint
locally and in CI with no cloud account. This is not a fake adapter — it is the
same protocol R2 and S3 serve.

The integration suite **skips loudly** when MinIO is not running, rather than
failing: storage is optional infrastructure and `npm test` must pass on a
machine that has never started it. The skip prints a visible warning, so a green
suite never silently means the round trip was untried. Both paths were verified:
126 ms with MinIO up, 21 ms plus the warning with it stopped.

---

## D4A.7 — No schema change

`ProductImage` already carries product association, optional variant
association, storage key, required alt text, width, height, position,
`isPrimary`, media type and timestamps, with indexes on `[productId, position]`
and `[variantId, position]`.

Every field the media architecture needs already exists, so no migration was
created. `contentType` and `bytes` columns were considered and rejected: nothing
reads them, and the content type is already fixed by the key's extension.
Migration churn for fields with no reader is a cost with no benefit.

---

## D4B.1 — The functions run in `fra1`, beside the database

Measured on production before changing anything. `/robots.txt`, which touches no
database, warms to **426 ms**. Every database-backed page cost **0.5 s to 3.4 s
on top of that**, and varied wildly between two consecutive requests to the same
URL — 0.85 s then 3.8 s for `/necklaces`.

The response header said why. `X-Vercel-Id: fra1::iad1::…` means the request
arrived at the **Frankfurt** edge, was routed to a function in **Washington
DC**, and that function then queried a database in **`eu-central-1`, which is
Frankfurt**. The request crossed the Atlantic to reach the compute, and every
single query crossed it again to reach the data.

There was no `vercel.json`, so the region was the platform default rather than a
choice anyone made. A category page issues roughly eleven sequential round
trips; at a transatlantic ~95 ms each that is about a second of pure flight
time, before a single row is read. In `fra1` the same round trip is a couple of
milliseconds.

The variance was the connection handshake — TCP, TLS and auth are several more
round trips, paid again by every cold function instance.

**Nothing about the queries changed to get this.** The same work, moved next to
the data it reads. D4B.2 then cut the number of trips.

---

## D4B.2 — Facets are asked concurrently, not one after another

`getCategoryFacets` awaited a query _inside_ a `for` loop over the category's
facet codes, so a page with six filters paid six sequential round trips to
answer six questions that have nothing to do with each other. `/rings` has
exactly six: price, karat, gold colour, diamond shape, carat and ring size.

Each facet is now built by its own function and all of them are awaited
together, which makes it one wave instead of six. The order of the returned
facets is unchanged — it still follows the configured order, because the results
are mapped back in place rather than pushed as they arrive — and a facet that
has nothing to show still drops out.

This is worth doing **even though D4B.1 made each trip cheap**: the two compound,
the saving grows with every facet a category adds, and a chain of awaits that
could be a fan-out is a latency bug wherever the server happens to run.

`getCategoryBySlug` and `descendantCategoryIds` are also memoized per request
with React's `cache()`. The category page asked for the same category twice on
every render — once in `generateMetadata`, once in the component — which was one
entirely wasted round trip per page view.

---

## D4C.1 — Paper is a generated material, not a CSS fill

The site's world is a diamond parcel: folded paper, blue tissue, a rubber
stamp. The first build of it rendered every one of those as a flat rectangle,
and the finish review said so — **material: contradicted**. It fabricated
nothing, which was right, but it also produced no material, so the parcel read
as a panel with a shadow rather than as paper.

`scripts/generate-paper-grain.mjs` produces the fibre: two octaves of
deterministic noise — fine grain with a slight directional bias so it runs
along the sheet, plus a long undulation so the sheet is not uniformly grainy
the way synthetic noise is — tiled seamlessly at 256px and quantised to eight
alpha levels.

**It is deliberately at the edge of visibility.** Grain you can see is a
texture effect; grain you can only notice the absence of is paper. The alpha
darkens and lightens whatever sits beneath it rather than tinting, so one sheet
serves every paper token without a variant per colour.

**Deterministic on purpose.** The seed is fixed, so regenerating produces the
same sheet rather than new noise — a texture that changes every build is a
diff nobody can review.

32KB, fetched once, cached for the whole site. A 512px tile was generated first
and weighed 284KB for grain nobody can resolve at this amplitude; after a
performance pass earlier in the same session (D4B.1, D4B.2) that would have
been self-defeating.

The PNG carries its own provenance in a `tEXt` chunk: procedural, seeded, not
photographed and not generated imagery.

---

## D4C.2 — The parcel world was replaced, and D4C.1 went with it

The briefke direction shipped twice and was rejected twice, for opposite
reasons. On a saturated trade-blue field the owner's judgement was that it does
not read as a jewellery house. Inverted to a pale ground it landed as the
generic light shop the site had been before — the exact fault the redesign
existed to fix — and the paper label carrying a red stamp in the first viewport
drew the owner's plainest note yet.

Both are the owner's calls and both are right. Recording the reason, because it
generalises: the direction was a **world** invented around the product rather
than a reading of what the product needs to look like. A diamond parcel is a
lovely object and a genuine piece of this trade, and none of that made the page
look like somewhere you would spend fifteen thousand shekels.

What replaced it takes a position instead of a world: **the only colour on the
site is the jewellery.** Paper and ink, no accent, no field, no stamp. The
distinction is carried by type at scale, by photography running edge to edge, by
hairline rules, and by how much paper is left empty — none of which can collapse
into "cream plus a serif", because none of them is a colour.

The generated paper grain from D4C.1 is deleted with it, asset and generator
both. It was the right answer to "the parcel renders as a flat rectangle"; there
are no parcels now, and a texture under a photograph on a gallery page is noise.
D4C.1 stays in this file as the record of why it existed.

---

## D4D.1 — The demo markers come off the products, in place

D3B.2 marked every seeded product three ways — a `demo-` slug, a `DEMO-` SKU and
"נתוני הדגמה בלבד — לא מוצר אמיתי." opening both descriptions — on the premise
that the products were fictional. That premise no longer holds. The owner has
confirmed that every model in the catalogue can be manufactured (PRODUCT.md,
"Products are representative"), so the pieces are honest demonstrations of what
the workshop makes. The marker meant for the database had become a false
statement on the storefront: every product page told a shopper the piece was
not real, and the slug and SKU repeated it in the address bar and on the page.

**What changed.** The seed no longer writes the notice, the prefixes, two
invented `DEMO-LAB` certificates, or two lines of product copy that asserted
stock ("במלאי", "מלאי מוגבל…"). The 18K prices it derives are rounded to whole
ten shekels instead of leaving agorot on a placeholder (₪3,115.20 is now
₪3,120).

**What is still invented, and stays flagged elsewhere.** Prices are placeholders
and stock levels are made up. Neither is marked in the data. The storefront is
responsible for not presenting them as facts: prices as estimates, and no
scarcity claims built from stock that is not real. That is a presentation rule,
not a data marker, and it lands in the Phase 1 storefront passes. Certificates
are not seeded at all: a certificate number names a real document, and an
invented one is a false claim rather than sample data.

**Why a script and not a re-seed.** The seed deletes the catalogue before
inserting it, and the product photography is attached afterwards by
`scripts/place-product-images.ts`, keyed on product ids. Re-seeding a database
that has its photographs unlinks every one of them. `scripts/remove-demo-markers.ts`
brings an existing database to the state the corrected seed produces without
creating or deleting a product, variant or image row. It is dry-run by default,
matches only the exact strings the seed wrote, aborts on any slug or SKU
collision, writes everything (search documents included) in one transaction, and
finds nothing to do on a second run. Its only deletions are the two invented
certificate rows.

Run against the development database on 2026-10-05. Afterwards the ids of all 51
products and 123 variants were unchanged, and so were all 286 image rows: their
product, variant, storage key, position and alt text. Those rows point at 154
distinct photographs, and every one still served from storage. All 51 search
documents were rebuilt without the notice's words.

**Storage keys keep their old names.** Objects in the bucket are still called
`…-demo-aurora-ring-yellow-main.jpg`. Renaming them would detach the photographs
for nothing a shopper can see. New uploads take the current slug.

**Old manifests still work.** A photo manifest written before this change names
`demo-aurora-ring`. `place-product-images.ts` tries the exact slug first and then
the slug without the prefix, and reports every fallback so the manifest gets
corrected. No other fuzzy matching is done.

**Slugs are URLs.** Renaming them changed every product URL. That is free today:
the site is not indexed (SITE_INDEXABLE) and has not launched. Done after
launch, it would need redirects.

---

## D4D.2 — Best sellers are one ranking: units sold, then the curated picks

"רבי מכר" is a claim about sales, and until now it was the membership of a
hand-kept collection, made in two places: the homepage band and a "רב מכר"
badge on each member's card. Nothing connected either to an order.

`src/lib/catalog/best-sellers.ts` now ranks products by units sold, from order
lines whose order reached a sold status (`PAID` through `COMPLETED`; not
`PENDING_PAYMENT`, `CANCELLED` or `REFUNDED`). The curated `best-sellers`
collection fills whatever places sales do not, in the curator's order. The
homepage band and `/collections/best-sellers` both read it, so the claim has
one source.

**Today it changes nothing a shopper sees.** There are no orders — the seed
creates none and checkout takes no payment — so the ranking is exactly the
curated collection. When paid orders exist they lead, with no code change. No
sales figure is invented, and none is displayed: the order of the list is the
only output. By the owner's instruction the band carries no explanation of how
it is chosen.

**The card badge went** (see D4D.4): a second, per-card copy of the claim would
have had to follow the ranking.

**Left open, as business calls:** all-time rather than a recent window, and no
minimum number of sales before a product outranks a curated pick. Either is a
change to `rankedBySales` alone.

---

## D4D.3 — Stock levels are not live, so the storefront states none

Every stock count in the database came from the seed. PRODUCT.md is explicit
that pieces are made after the order. Built from those counts, the storefront
put a "נותרו … במלאי" line on eight cards (two of them made-to-order pieces).
On product pages one colour of a piece read "במלאי", the next "מיוצר בהזמנה",
and two variants said "אזל מהמלאי" — none of it true of anything.

`STOCK_LEVELS_ARE_LIVE` (`src/lib/inventory/disclosure.ts`, `false`) now gates
it, and `toAvailability` applies it:

- no low-stock threshold is applied, so no unit count reaches a card or a
  product page;
- a made-to-order variant resolves as made to order whatever its count, so its
  page states the configured lead time, consistently across colours;
- a DENY variant still resolves from its count, so `isPurchasable` keeps its
  meaning for the cart, but the product page says nothing about it — no
  "במלאי", no "אזל מהמלאי".

**A constant, not an environment variable.** Real stock arrives with the admin's
inventory workflow, which is a code change anyway. Prices, which the owner can
make real by data entry alone, have `PRICES_FINAL` instead.

**The mechanism stays tested.** `toProductCard` takes the policy as an option,
and its unit tests cover the live path: a DENY product at its threshold says so.

**Still open:** the lead times themselves ("זמן הכנה משוער 14 ימי עסקים") come
from the seed too. They are kept because they describe how the workshop works
rather than how much it holds, but they need the owner's confirmation. And
before checkout ships, the DENY variants' `isPurchasable` rests on invented
counts — two of them would refuse a sale.

---

## D4D.4 — One badge per card, and no wishlist or account until they work

**Badges.** A card could carry "חדש", "רב מכר" and "בהזמנה אישית" at once, stacked
on the photograph. "בהזמנה אישית" is the norm in this workshop, so badging some
cards implied the others were not; "רב מכר" duplicated the band it sat in and
contradicted "חדש" beside it. `ProductCardData.badge` is now a single optional
value and `ProductBadge` is `'new'` alone. The product page's "בהזמנה אישית"
badge went as well: the line under the price already says "מיוצר בהזמנה" with
the lead time.

**Wishlist and account.** The heart on every card and product page toggled a
local state that was lost on navigation, and the header and drawer linked to
pages explaining that nothing worked. All of it is withheld: no heart, no
header or drawer link, and `/wishlist` and `/account` are 404s, as `/contact` is
without a channel. `WishlistButton` is kept, unrendered, because its
accessibility contract is the part Phase 6 should reuse. The cart stays, by the
owner's instruction: checkout is the next piece of work, not a removal.

---

## D4D.5 — The first screen is sized from the header, and every control takes 44px

**The first screen.** The hero subtracted a flat 11rem from the viewport, which
allowed for a 4rem header. The desktop header is 8rem plus a hairline, so on
every desktop the headline began just below the fold and the first screen said
nothing; on an upright tablet the 21:9 photograph was stretched 2.6x across a
tall box and cropped to the wall beside the model.

- `--header-height` (globals.css) states the header's height once. The hero, the
  sticky product gallery and anchor scrolling read it; header-height.test.ts
  holds it to the header's own row classes. The product gallery's offset had
  been 90px too low on tablets.
- From 64rem the photograph takes whatever height the headline and its action
  leave, so both are on the first screen down to about 620px of height. This
  changed DESIGN.md's First Viewport Rule, by the owner's decision: the old rule
  had the top of the line breaking the fold. The headline's measure went from
  56rem to 64rem so it sets in two lines, and under 800px of height (`short:`)
  it steps down one size. Below 64rem the photograph still fills the screen but
  for 7rem.
- The hero picks its crop by orientation instead of width, so every portrait
  screen gets the portrait master. Its focal points were aimed at a previous
  pair of masters - the wide one at empty wall, the portrait one at the left
  edge - and now follow the delivered files.

**Touch targets.** The audit measured 27px, 22px and 18px tap targets on phones.
Two mechanisms, chosen by whether a control can grow without being redrawn:

- `touch-target` (a utility) adds an invisible box that grows a control to at
  least 44x44px and adds nothing to one already that size. Used on lines of
  type, breadcrumbs, chips, swatches and option buttons, where nothing drawn
  changes.
- Tightly stacked lists (the footer, filter values, active-filter chips) would
  overlap if their targets grew outward, so under a touch pointer
  (`pointer-coarse:`) their rows become 44px. Under a mouse they keep their
  compact rhythm.

Icon buttons went from 40px to 44px, and text fields are 16px under a touch
pointer so iOS does not zoom into them. A decorative chevron in the breadcrumbs
was painted over a link's tap area by its mirroring transform; it no longer
takes pointer events.

**Also:** the best-sellers rail sets two across until 80rem instead of three
and an orphan, and the subcategory chips no longer draw a scrollbar.

---

## D4D.6 — A 12px floor, a Hebrew reading measure, and one rule per heading level

**The floor.** The type scale had an 11px step (`text-2xs`), and it was setting
sentences, section labels, the badge and a product's SKU - the SKU in a 70%
grey that measured 2.8:1. In Hebrew, 11px loses the single strokes that tell
ד from ר and ה from ח. The step is removed rather than discouraged, every use
moved to 12px, and `type-floor.test.ts` fails if a size below 0.75rem comes
back, from the scale or as an arbitrary value. Translucent ink is no longer used
for text. DESIGN.md's Label role moved from 0.6875rem to 0.75rem, as the
approved plan's 12px minimum requires.

**The product page reads like a page that is read.** Its descriptions, lead-time
line, personalisation list and diamond details were 14px in the metadata grey.
They are 16px in Soft Ink, the colour DESIGN.md has always given to secondary
prose but that had no semantic token until now (`text-soft-foreground`).
Controls stay at the 14px UI size. The title went from 36px regular - the only
heading on the site that did not read as one - to the display face at 700,
36px stepping to 48px from `xl`: one size under the category title it is
reached from, because it shares a column with the price and the options.

**One rule per heading level.** Two of the homepage's section headings
(categories, FAQ) were regular weight, one of them a size smaller, between
sections set in DESIGN.md's Title role; the custom and contact pages set theirs
in the body face; the error page's title was body type too. All now follow the
role for their level. Alignment still varies with each band's layout - centred
over a rail, start-aligned over an asymmetric grid - and was left alone.

**A reading measure, by the owner's decision.** Assistant's Hebrew averages about
0.41em a character, so DESIGN.md's 40rem prose container held about 98
characters a line at 16px. Long text now takes `--measure-reading`, 30em -
about 74 characters at any size. The FAQ uses it; the 40rem container stays for
cards and one-line intros.

**The hero's action carries weight.** It was 18px under a 92px line. It is now
semibold at 18 → 22 → 28px with a 2px rule - still a line of type, per the
Underlined Action Rule. The first screen still holds it at every desktop height
(D4D.5); the photograph gives up a few pixels.

**Considered and not done.** The audit suggested trying the headline at regular
weight or about 64px so the photograph leads. That is a taste call the plan did
not include. Collection names stay as large as their band's title: DESIGN.md
puts both in the Title role.

---

## D4D.7 — The shipped components now match DESIGN.md

The audit found the components contradicting the design system they were
documented against (its finding #22). Each conflict was resolved toward
DESIGN.md, because nothing in the code made a case for the deviation:

- **Actions are square.** Subcategory, search and active-filter chips were
  pills; the filter button, pagination, product option buttons, the filter
  drawer's actions and the search rows had 4px corners. DESIGN.md: an action
  never takes a rounded corner. Radius stays where it is allowed - drawer close
  controls, empty-state frames, the badge, swatch dots, list markers, and the
  filter checkboxes (0.25rem).
- **Fields are underlines.** The sort menu and the price inputs were boxes. The
  price fields now carry the shekel sign and are each one `<label>`, so a tap
  anywhere on the 44px field focuses the number.
- **No panels.** The stone type on the product page sat in a tinted panel with a
  2px side stripe; it is now a plain line in ink. Contact channels (shown only
  when configured) sit under hairlines instead of in boxed cards.
- **One link treatment.** "לצפייה בהכל" and "לכל השאלות" were a fourth action
  style whose hover changed ink to ink. They are now the underlined line the
  collection links already used; the mega menu's links and the homepage FAQ
  rows also had invisible hovers and now underline.
- **The hero settles again.** DESIGN.md's one atmospheric motion - the hero
  photograph releasing from a 4% over-scale - was lost when the hero was
  rewritten, leaving its keyframes unused. It is back, clipped to the frame.
- **Shared components.** Two hand-built "clear" buttons are now `Button`, which
  gained a `scroll` prop so clearing filters still keeps the page where it is.

Also: the browser's blue search-clear x and the number spinners are themed or
removed; the filter tick is a drawn icon instead of a "✓" character; the
homepage's FAQ questions link to their answers (`/faq#id`) instead of the top
of the page; a product option with a single value is stated rather than drawn
as a one-button choice; the relevance sort is offered only with a search term;
and the 404 has its own title. DESIGN.md's footer line now describes the
columns that exist rather than five.

**Not changed:** 12 products per page. Rings run to two pages at 12; 24 would
show every current category whole. It is a listing decision, and the
pagination tests are built around 12.

## D4D.8 — The checkout is real up to payment, and stops there in words

The product page was a dead end: no way to buy, and nothing to say so. The
critique's one P0. The owner's brief: a real cart and a real checkout that
saves a real order, no charge, and an ending that says plainly that payment is
not active - built as the finished flow, so that turning payment on later is
one adapter and nothing else.

**What exists now.**

- **A guest cart** (`src/lib/cart/`): a `Cart` row found by a random 192-bit
  token in an httpOnly, `SameSite=Lax` cookie. Reading never creates a cart;
  the first add does. The header shows the count, read by the storefront layout
  per request (which makes the three static info pages request-time too; with
  no cookie there is no query).
- **One resolver for a line** (`line.ts`), used by the cart page, the checkout
  and order creation alike, so the price reviewed is the price recorded and a
  line the cart marks unavailable is one the order refuses. Nothing on a line
  is trusted as stored: price, labels and validity are recomputed from the
  catalogue on every read.
- **The product page buys.** Personalisation became inputs (the server
  validates the product's own field rules and prices the surcharge); one
  primary "הוספה לסל"; missing choices are named at their field and the first
  one takes focus. A combination that cannot be ordered says so in words -
  there is still no disabled button.
- **Checkout** (`/checkout`): details, delivery, review, as three views of one
  form (back never loses a field; the browser's back leaves the checkout). What
  was typed is kept in sessionStorage for the tab and cleared once the order is
  placed. Delivery to someone else is one checkbox; the recipient's fields are
  worded around the delivery ("שם לקבלת המשלוח") to stay free of gender.
- **Placing the order** (`src/lib/orders/place-order.ts`), in one transaction:
  customer found or created by normalised email, the order written as
  PENDING_PAYMENT with every line frozen (names, labels, SKU, personalisation
  with its labels, the diamond and certificate, price, promised lead time),
  stock held through `reserveInventory`, cart emptied. A cart that changed
  under the shopper is refused, not trimmed. The last unit of a stocked piece
  goes to one order; the other is refused and leaves no trace (tested).
- **Payment** (`/checkout/payment`): with no provider configured - today - the
  page says the order is saved, payment is not active, nothing was charged, and
  nothing is made until it is paid. No check mark, no thanks. With a provider it
  hands off to the provider's page (`startPaymentAction`). `/order/confirmation`
  renders only a PAID order, so it is unreachable until payment exists.
  `src/lib/payments/provider.ts` lists the activation steps.

**Schema change: `Order.accessTokenHash`** (migration
`20261005120000_order_access_token`, additive, nullable, unique). The payment
page, the provider's return and a future "view your order" email all need a
guest to reach their own order without an account. Order numbers are
sequential and printed, so they cannot be the key; the browser holds a random
token and the database stores only its SHA-256. It applies on deploy through
`prisma migrate deploy`, which the Vercel build already runs.

**Decisions inside the build:**

- **Shipping is free** - the owner's decision (TBD B4, resolved). A constant in
  `pricing.ts`, recorded per order.
- **VAT is stated only when configured** (`VAT_RATE_BPS`, optional, never
  defaulted - TBD B21). Prices include VAT either way.
- **No marketing opt-in checkbox.** The schema supports one, but there is no
  email provider (I2) and no privacy policy (L5): asking for consent to a list
  that does not exist, from an address nobody has verified, is a promise the
  shop cannot keep. `marketingOptIn` is sent as false; when the box returns,
  consent only ever moves toward yes on an order and must be confirmed by the
  email provider before anything is sent.
- **No terms checkbox.** There are no terms yet (L1); a box agreeing to nothing
  would be theatre.
- **The review step's button names its action.** "שמירת ההזמנה" while no
  provider exists, "להמשך לתשלום" once one does, with a line above it saying
  payment is not active.
- **No sticky bar on the checkout form**, a deviation from the brief: on a
  phone it covers the field being typed into once the keyboard opens. The
  button follows the last field instead, and the order total sits in the
  folded summary at the top.

**Not built:** an undo for removing a line (re-adding from the product page is
one tap away), and quantity on the product page (jewellery is bought one at a
time; the cart changes it).

## D4D.9 — The listing keeps its place: no remount, counted filters, paging to the grid

The critique's hardening findings, all on the catalogue pages:

- **The filter drawer no longer closes after every choice.** The listing sat
  in a Suspense boundary keyed on the query string, so each filter tap
  remounted it - drawer, expanded groups, scroll and focus included. The key
  is gone; filter, sort and page changes run as one React transition
  (`src/components/category/CatalogTransition.tsx`) that keeps the current
  results on screen, dimmed and `aria-busy`, until the next set arrives. The
  skeleton is for the first load only. Filter values are still real links
  (`CatalogLink`): no-JS, new-tab and copy-link behave as before.
- **Every filter value says how many products it leads to.** Counted in
  PostgreSQL with the listing's own predicate (`getFacetCounts`, over
  `buildCatalogWhere`), so a count cannot disagree with its grid; tested
  against the grid totals. Each value is counted against the other facets
  (values within a facet are alternatives). About twenty count queries per
  listing, concurrent - measured at ~0.3s for the whole page warm. A value
  that would lead to nothing is shown with its 0 but is not a link; a chosen
  value stays a link at any count, so it can always be cleared.
- **A new page starts at the top of the grid.** Pagination links carry
  `#results` and scroll to the toolbar; they used `scroll={false}`, which left
  a shopper paging from the bottom looking at the bottom of the next page.
- **Hebrew counts.** `countOf` (`src/lib/i18n/count.ts`) names the one -
  "מוצר אחד", "מסנן פעיל אחד" - instead of "1 מוצרים"; every count on the site
  goes through it.
- **Headings step down one level.** Product names were always `h3`, so every
  category, collection and search page jumped from `h1` to `h3`. The grid now
  takes a level: `h2` under a page title, `h3` inside a homepage section.
- **Field and checkbox strokes hold 3:1.** `line-strong` moved from `#b9b6ae`
  (1.9:1 on paper) to `#8c8881` (3.4:1 on paper, 3.1:1 on the recessed band;
  ink selected text on it, 5.4:1). Same hue, same role - "where a line has to
  read as a control" - so DESIGN.md's palette keeps its two hairlines; only the
  value changed. Link underlines at rest are darker as a result.

Also: the placeholder registry's "filters do nothing" entry was removed; they
have worked since Phase 3B. The price fields reset when their range is cleared
elsewhere (a chip, "נקה סינון"), since the form no longer remounts.

## D4D.10 — Grades keep their printed words and gain their meaning

The critique found the product page speaking the trade's shorthand to a
shopper: "G", "VS1", "Excellent", "Emerald" with nothing beside them; a ring
size of "52" without a unit; "קראט" for gold purity a few rows above "קראט"
for a stone's weight; and an FAQ answer on grading that listed the grades and
explained none.

- **Glossed, not translated.** A certificate prints "VS1"; the page still does,
  because a shopper comparing with a certificate or another shop needs the
  same word. Beside it now: its place on the standard scale in Hebrew -
  "VS1 · פגמים זעירים, נראים רק בהגדלה", "G · כמעט חסר צבע",
  "Excellent · מצוין" (`src/lib/catalog/diamond-terms.ts`). The glosses
  describe the laboratories' scales, not any stone in particular, and a grade
  off the scale is left unglossed rather than guessed at.
- **Shapes are Hebrew first** - "עגול", "אובלי", "טיפה" - in the filters, in
  their chips and on the product page, where the certificate term follows
  ("עגול · Round"). URL tokens and stored values are unchanged.
- **Ring sizes state their unit**: the European scale, the ring's inner
  circumference in millimetres - the only scale the catalogue's 48-60 can be -
  with a link to the FAQ answer, which now also says how to measure an
  existing ring (inner diameter x 3.14).
- **"קראט זהב" for the gold.** The option label was catalogue content
  ("קראט" on 44 options), so it changed by a data migration
  (`20261006090000_gold_karat_label`) that touches only rows still carrying
  the seed's label, plus the seed itself. The stone keeps "משקל כולל ... קראט";
  the FAQ now says outright that the two are different measures.
- **The grading answer explains each scale** - weight, colour, clarity, cut,
  shape - in the order the product page lists them.
- **Shipping in the FAQ splits** into what is decided (free, B4) and what is
  not (delivery time, B5), which stays unpublished as before.

## D4D.11 — The catalogue filters what a piece is, not what it can be made in

PRODUCT.md is unambiguous: the workshop is the owner's, so every model can be
made in another karat, gold colour, size or length, and "the site may promise
alteration freely". The catalogue said the opposite. Its karat, colour, ring
size and length filters answered "which models LIST this value": 43 of 50
products list fewer than all three gold colours, 31 list one karat, and size
48 appears on 2 of 18 rings - so a shopper who asked for rose gold, or for
size 48, was shown a fraction of what the workshop would make for them, and
"emerald + yellow" came back empty.

- **Filters keep what a piece is**: price, stone shape, carat, style, pendant
  type. Karat, gold colour, ring size and length left every category's
  `filterConfig` by data migration (`20261006100000_filters_without_made_to_measure_axes`,
  order preserved, nothing else touched), the seed and the search page. Old
  links carrying those parameters are inert - the same normalisation that
  already ignored `?ringSize=52` on a necklace page. The facet machinery is
  unchanged and still supports them, should a future catalogue hold pieces
  that genuinely cannot be altered.
- **Where a shopper looks for those filters, the reason**: the top of the
  filter panel says there is no need to filter by them - every model can be
  ordered in any of them.
- **On the product page, one true line under the options**: "רוצים גוון זהב,
  קראט או מידה אחרים? כל דגם אפשר להזמין גם בהם", naming size for a ring and
  length for a chain, with a link to how a custom order works. It promises no
  price and no lead time for an unlisted configuration, because none is set.
- **An empty filter result offers custom design** beside "נקה סינון".

**Not done:** a "view in white gold" preference that switches card photographs
to a colour; widening every ring's listed sizes; prices for unlisted
configurations. The first is a feature, the other two are catalogue decisions
for the owner.

## D4D.12 — The homepage gives bridal its moment and ends on the workshop

Same visual world, new order and weight. The critique measured the lower
homepage as generic: collections took 36% of the page for four links, "רבי
מכר" appeared twice (and its "view all" opened the same four products),
bridal sat seventh in a framed box, and the page ended on three FAQ links and
the footer's line that prices are estimates.

The page now runs: hero, categories, best sellers, **bridal**, diamonds,
collections, FAQ, **the workshop**.

- **Bridal takes the hero's grammar, fourth instead of seventh**
  (`FeatureBanner`): a full-bleed photograph - the portrait master on a phone,
  a wide band whose height leaves the line on screen from 48rem - the display
  line on paper beneath it, the action an underlined line. Nothing laid over
  the photograph.
- **Collections are one row** of the collections without a band of their own
  (new arrivals, personalised); best sellers and bridal are not listed again.
  36% of the page became 11% at 1440px.
- **"לצפייה בהכל" on best sellers appears only when there is more to see** than
  the four in the rail.
- **The rail goes four-across from 64rem**, like every category grid, instead
  of waiting for 80rem; at 1024px the two-by-two rail had taken a quarter of the
  page. DESIGN.md updated.
- **The page closes on the workshop** - "תכשיט שנבנה לפי בקשה" - at the finale
  spacing tier, the line a size up, the action underlined: the shop's one real
  advantage as the last word instead of a disclaimer. Its action says
  "לפרטים ולפנייה" only when a contact channel exists; without one it reads
  "איך זה עובד", which is what /custom then offers.
- **The product photograph takes its column.** A fixed 26rem cap held it at
  ~420px beside a 235px empty gutter; the remaining cap is the viewport's
  height, which a sticky square needs. At 1440x900 the frame is 477px - the
  column less the thumbnail rail.

## D4D.13 — Polish: motion on the system, honest labels, titles sized to the page

The critique's minor findings, closed:

- **Category tiles drift like every other image.** Their hover zoom was 700ms
  of stock ease-out; it is now the `drift` tier on the house curve, as the
  product and collection images already were.
- **Under reduced motion the zoom goes, rather than snapping.** The global rule
  shortens transitions to nothing, which made a hovered photograph JUMP to its
  zoom - a jolt where a drift was meant. Every hover zoom now has
  `motion-reduce:group-hover:scale-100`.
- **Search examples are called examples.** "חיפושים פופולריים", "חיפושים
  נפוצים" and "אולי התכוונת" claimed a popularity count and a spelling
  correction that do not exist; the shared list (`src/lib/search/examples.ts`)
  is headed "הצעות לחיפוש" before a search and "אפשר לנסות" after one that
  found nothing.
- **Pages that are a sentence take the smaller title.** Search and the 404 set
  a 72px headline over one line of text; they now use the product page's
  2.25rem → 3rem `h1` (`PageHero size="compact"`), as the cart and checkout
  do. DESIGN.md's Headline role names them.
- **The hero line matches its photograph.** "...מהסדנה שלנו לאצבע שלך" ran
  over a necklace; it reads "תכשיטי זהב ויהלומים, ישר מהסדנה שלנו" - the same
  manufacturer-direct claim, without the finger.
- **Stale comments.** ProductCard still spoke of "the one red in the palette";
  FeatureBanner described copy laid over the photograph (it was rewritten in
  D4D.12).

## D4D.14 — Custom requests are saved, numbered and answered from the database

The critique of 2026-10-06 (27/40) put one issue at P0: every product page,
the menu and the home page's closing band invited custom work and arrived at
/custom, whose first step, "פנייה", had no action while no contact channel
exists. The owner chose to save requests on the site.

- **The flow.** `/custom/request` holds one form with two starts. From a
  product page (`?product=<slug>` plus the product's own choice parameters,
  D4D.16) the model is drawn beside the form with the choices that were on
  screen, and the form asks what to change - chips for gold colour, karat,
  size or length, stone, engraving, something else - and in words. From
  /custom it asks what kind of piece. Then a name and a phone OR an email.
- **What is saved.** A `CustomRequest` with status NEW and its first status
  event; the model as a real relation (`productId`) and as a snapshot of the
  catalogue's own wording at that moment (`productSnapshot`), and the change
  areas as codes (`changeAreas`). The browser never names a label: the slug
  and choices are resolved against published products, and an unknown value
  is dropped. Migration `20261006120000_custom_request_from_product` makes
  `email` and `phone` nullable under a CHECK that one of them is present.
- **What the visitor is told.** The form becomes its receipt: "הבקשה נשמרה",
  the request number (from 500001), what was saved in their words, and that a
  design and price come for approval before any work, with nothing charged.
  No reply time is promised - none has been decided.
- **Nobody is notified.** There is no email provider and no admin screen, so
  requests wait in the database. `npm run requests:list` prints the new ones
  (`-- --all` for every request); pointed at production's DATABASE_URL, it is
  how the workshop reads them until notifications exist (owner decision).
- **Abuse.** A hidden trap field refuses scripted submissions without saving,
  and requests are capped (D4D.19).
- **Entry points.** The product page's "made your way" line links to the
  request for that model as configured; /custom ends on "לשליחת בקשה" beside
  the workshop photograph; the home page's closing band links to the form.
- **The collection is renamed.** "עיצוב אישי" named both the custom-design
  page and the collection of name, initial and photo pieces. The collection is
  now "תכשיטים אישיים" (migration `20261006130000_...`, seed updated; only the
  unedited seed name is replaced).

## D4D.15 — The stone's origin is stated, filtered, and the copy no longer offers a choice the shelves lack

All 8 diamond rings are lab-grown; only one pair of studs and one tennis
bracelet are natural. The copy said "טבעי או מעבדה — הבחירה שלך" and three
ring categories promised both.

- **A "סוג יהלום" filter** (`diamond_type`, `?diamond=lab,natural`) reads
  `DiamondSpec.isLabGrown` at product or variant level. Both values are always
  offered where there are diamonds, so a category with no natural stone shows
  "יהלום טבעי 0" - with "יהלום טבעי אפשר לבקש לכל דגם" and a link to the request
  form beneath. Added to every category's filters, second after price
  (migration `20261006140000_diamond_type_filter`, seed and /search updated).
- **Origin as text** on every diamond product card and under each product's
  title, from one helper (`diamondOriginLabel`), plural for several stones.
- **Literal copy.** The home panel is "יהלומי מעבדה, וטבעיים לפי בקשה"; the FAQ
  says most stones are lab-grown and a natural one can be requested; the ring
  category descriptions say the kind is stated on every model and natural can
  be asked for (migration `20261006150000_diamond_origin_copy`, unedited seed
  text only). "רוב" is true of the catalogue today (20 of 22); if the mix
  changes, that one word is the owner's to revisit.
- "רבי מכר" is unchanged, by the owner's earlier decision.

## D4D.16 — The purchase flow keeps what the shopper did

- **The phone drawer's main button applies a typed price.** It used to only
  close the drawer, discarding a range typed but not sent. A range that
  differs from the address is submitted first. The separate "עדכון טווח
  מחירים" button is gone from the drawer (Enter still applies); the desktop
  panel keeps it. Price placeholders carry thousands separators.
- **Choices live in the address**: `/product/aurora-ring?karat=18k&color=rose&size=52`
  (`src/lib/catalog/choice-params.ts`). Written with `replaceState` on every
  change - no navigation, no history entry - read by the route for the first
  render and again in the browser on arrival, because a page restored from the
  router cache on Back carries its first visit's props. Back, reload and a
  shared link reopen the piece as it was made. An address naming an impossible
  combination falls back to the first variant. The canonical stays the bare
  product path.
- **The size guide opens in place**: a disclosure under the sizes, with the
  inner diameter of each size worked out (size / pi), so measuring a ring that
  fits is a matter of reading a row.
- **Engraving is checked as it will be cut** (`src/lib/personalization/engraving.ts`,
  shared by the page and the server): length in graphemes - the characters a
  person sees - not UTF-16 units, and no `maxLength` attribute to cut a
  pointed letter in half; emoji refused; letters checked against the chosen
  language, with digits and punctuation allowed in both. Each refusal names
  the way out.

## D4D.17 — The name necklace shows the name and the price it is sold at

- **"כך ייכתב השם"**: the typed name in the display face, ink on paper,
  centred under the photograph (under the field on a phone), right to left or
  left to right by the chosen language. The caption says it is the lettering,
  not a rendering of the pendant - the shape of the letters in gold is the one
  photographed.
- **A required surcharge is part of the price.** The name cannot be skipped,
  so the page shows "₪1,380 כולל החריטה" and the field "₪90 כלולים במחיר";
  cards include required surcharges in their figure too. An optional
  surcharge, once filled, is still added beside the button. The denormalised
  `minPriceAgorot` used by price filtering and sorting does not include
  required surcharges; for the one product that has one, the filter is ₪90
  generous.

## D4D.18 — Polish: one edge, one action style, the menu says where you are

- **The Start Edge Rule** (DESIGN.md): the home page's section headings, the
  subcategory chips, the notes under grids and the contact page begin at the
  inline start, like every page title and the hero line.
- **Every editorial panel's action is an underline**; the diamonds panel's
  ruled box was the one outlined action between underlined ones.
- **The menu marks the current section** (`aria-current`, the open-menu rule in
  full paper; underlined and semibold in the drawer). The drawer's chevrons
  point down for a list that opens in place.
- **No SKU on the product page.** It stays on the order line.
- **The tab title is the product's name**, as its heading is; the owner's SEO
  title moves to the shared-link title.
- **Payment's state is said in the bag**, before any details are asked.
- DESIGN.md's collections band now describes the row it ships as.

## D4D.19 — The owner's answers: promises confirmed, a privacy policy, a cap on requests

Answered by the owner on 2026-10-06:

- **The promises stand.** Any model can be made with a natural stone on
  request, and every request is answered with a design and a price. The copy
  of D4D.14 and D4D.15 says both and stays as written.
- **Notifications: WhatsApp, later.** Recorded in TBD.md I2. Until then,
  `npm run requests:list`.
- **A standard privacy policy** at /legal/privacy, linked from the footer, the
  checkout's details step and the request form. It is written from what the
  code does - the fields the two forms ask for, the two essential cookies
  (cart, 30 days; order, 1 day), the details kept in the tab's sessionStorage,
  no analytics, no advertising, no marketing list - under the Amendment 13
  headings: who, what, why, whether it must be given, who receives it, for how
  long, security, rights. It names the operator as Jewelry for Less - the business's own name, as the
  owner confirmed - and with no contact channel set it
  routes privacy requests to the request form. The owner should add the
  registered details and have it reviewed (TBD.md L5).
- **Requests are capped**, counted in the database: three a day per phone or
  email, thirty an hour across the site. Each refusal says when to try again.
- Ring resizing (the "לא בטוחים במידה?" path) is still the owner's to answer.

## D4D.20 — The remaining critique items: reach, search, the empty bag, undo, a shorter header

The minor findings of the 2026-10-06 critique that needed no business
decision, closed:

- **"הוספה לסל" within reach on a phone.** It sat about 1,190px down at 375px.
  A bottom bar with the price and the same handler shows while the page's
  button is still below the screen and leaves when it arrives
  (`StickyPurchaseBar`); a missing size is still pointed at, at the field.
  On desktop the "made your way" line moved below the button, which lifts it
  about 60px toward the 900px fold.
- **Search has a field.** /search showed what was searched for and no way to
  change it; the term now sits in an underlined GET form. A search that ranks
  nothing shows its message without a filter bar and "0 מוצרים" above it; the
  message is no longer a dashed box, and its suggestions start at the edge.
- **The empty bag opens the shop**: the five category photographs, and the
  custom request for anything not in the catalogue.
- **Checkout survives a reload on its step.** The step is kept in the tab's
  sessionStorage with the fields, and restored only when every step before it
  still validates. The phone message no longer says "digits only" over a
  field that accepts dashes.
- **Undo after removing from the bag.** The removal returns the line's
  configuration; "ביטול" adds it back through the ordinary add, so it is
  validated again. The notice sits above the lines and survives the bag
  becoming empty.
- **The menu.** The "גילוי" column is "אוספים", for the two collections it
  holds; the engagement feature carries the bridal collection's still.
- **A shorter header.** Masthead 5rem to 4rem, navigation row 3rem to 2.75rem
  (still a 44px target): 129px to 109px on desktop. `--header-height` follows,
  held by header-height.test.ts.

Still open from the critique, each waiting on something other than design:
ring resizing ("לא בטוחים במידה?", owner), shipping and returns answers
(owner), the bridal photograph's studio styling (photography), painted colour
swatches (photographs of the metals), and thumbnails in instant search.

## D4D.21 — Worn images may be generated, and say so

The owner will generate worn images (a piece on a hand, an ear, a neck) with
an AI tool rather than photograph them; every catalogue design is one the
workshop makes, so the product images themselves stand.

- **`ProductImage.isSimulation`** (migration `20261007090000_...`, default
  false, no existing row changes) marks a generated image. The gallery labels
  it "הדמיה" in the over-photograph chip, outside the zoom, whenever it is the
  image shown; its alt text ends "(הדמיה)".
- **A third slot.** `scripts/place-product-images.ts` takes role `worn`
  (position 3, after main and detail), simulated by default; cards keep showing
  the packshot and its close-up.
- **The rules for generating them** are in `docs/photography/worn-image-prompts.md`:
  the same piece exactly, true size from a carat-to-millimetre table (tools
  enlarge stones), one natural-daylight look matching the category photographs,
  no recognisable people. `photo-kit/` (not in git) holds each product's source
  image and the site's style references.
- **Not generated:** anything presented as the owner, the team, the workshop or
  a customer.
- The drop earrings' render shows ovals far larger than the listed 0.60 ct for
  the pair; one of the two is wrong and is the owner's to check.

## D4D.22 — Every menu panel has its photograph

Only "טבעות" ended its mega-menu panel on a feature with a photograph; the
owner asked for the same in every menu. Earrings, necklaces, bracelets and sets
now end on one too, each leading to a real sub-category with products in it:
diamond earrings, diamond necklaces, tennis bracelets, bridal sets.

- **The photographs** (`public/images/editorial/menu/`, 3:2) are generated
  still lifes in the look of the rings panel's own (ivory silk, window light),
  each composed from that sub-category's actual pieces as reference.
- **Necklaces lead to diamond necklaces, not name necklaces.** The name
  necklace was the first choice, but the image tool could not cut Hebrew
  letters correctly in two attempts ("רות" misspelled, the alef garbled), and
  a misspelt name on the piece the panel is selling is worse than no panel.
- The bridal photograph on the home page was replaced the same way (see the
  `bridal` registry note).
- Noted for the owner: the three-piece bridal set's description promises
  earrings while its photographs show three rings.

## D4D.23 — The owner's photo review, fixed image by image

The owner went through every product page and listed 25 image problems:
missing yellow-gold photographs, blurred or cropped close-ups, on-body images
that showed a different piece (no earring back, the wrong gold, a visible
clasp, a shorter drop), and missing on-body images. Each was answered with a
generated image made from the product's own photograph, reviewed against it
before it was kept.

- **A yellow-gold option for six pieces** (`scripts/add-yellow-gold-variants.ts`,
  dry run by default): pear solitaire, pavé band, emerald-cut ring, diamond
  hoops, diamond cuff and the three-piece bridal set were listed in white (or
  rose) only. Every model is made to order in any colour, so each yellow
  variant mirrors its white one exactly: same karat, price, lead time, policy.
  It adds only; no id, variant or photograph is touched. It is a catalogue
  change and has to be run on production too.
- **46 images placed** with `scripts/place-product-images.ts`. Packshots
  recoloured to a new gold, and clean re-renders of blurred or cropped
  close-ups, are product photographs and carry no label. Every image of the
  piece on a hand, ear or neck is a simulation labelled "הדמיה", including
  those that now fill position 2 where the seed's on-body photograph was wrong.
- **The drop earrings keep their own on-ear photograph.** The simulation added
  in D4D.21 was removed; it showed the drop shorter than the piece.
- **The bangle needs no clasp**: it is a closed circle that slips over the
  hand, and its new on-wrist images show it that way.
- **The three-piece bridal set now shows what it sells.** Its description
  promises an engagement ring, a wedding band and earrings; its photographs
  showed three rings. New photographs (main and close-up, white and yellow)
  show the engagement ring, the matching pavé band and a pair of studs.
- Diamond size as a choice on the product page: built in D4D.24, priced by
  the owner from the admin.

## D4D.24 — The admin: sign-in, orders, requests, products and diamond sizes

Orders were saved but nobody could see them; custom requests were read with a
script; products changed only by scripts. The owner asked for an admin for a
fixed list of people, signing in with email and password, and for every piece
to be offered in more than one diamond size.

- **Sign-in, not Auth.js.** ARCHITECTURE 7 named Auth.js with a Credentials
  provider, which only supports signed-cookie sessions. The admin needs
  sessions that end the moment someone is disabled or changes a password, so
  it uses the schema's own `Session` table directly: a random token in an
  httpOnly cookie, only its SHA-256 stored, seven days. Passwords are
  Argon2id (`@node-rs/argon2`). Customer accounts, when they come, can still
  adopt Auth.js; nothing here blocks it.
- **Defence in depth, as ARCHITECTURE 6 asks.** Middleware sends any request
  without the cookie to the sign-in page; every admin page and every admin
  action then verifies the session in the database itself. Admin responses
  are `noindex` and `no-store`, and `/admin` is disallowed in robots.txt.
- **Guessing is capped in the database**: five wrong passwords per address
  or thirty per network in fifteen minutes (`LoginAttempt`, addresses stored
  only as hashes). Every refusal reads the same, and an unknown address takes
  as long to refuse as a wrong password.
- **People are added by script** (`npm run admin:user`), not by a sign-up
  page: the list is short and fixed. `User.displayName` names them in the
  history; `User.disabledAt` revokes them without deleting the history they
  wrote. Migration `20261007120000_admin_auth` was written by hand: the
  generated one also tried to drop the order and request number sequences.
- **Orders**: list by status with search by number, name, phone (digit for
  digit) or email; the order as it was placed, from its own snapshots; status
  changes as history with author and note; cancelling releases the stock the
  order held. Payment status is not editable: it belongs to the payment
  provider's confirmations.
- **Custom requests**: the specification's workflow, with the quote amount,
  its details, the date it went out, internal notes and a WhatsApp link.
- **Products**: words, visibility, archive and restore, and every variant's
  price; the price range the shop filters on and the search document are
  kept in step. Creating a new product and uploading photographs are not in
  this pass.
- **Diamond sizes.** A "גודל יהלום" option is a variant axis: the size a
  piece is listed in becomes the base, and each added size mirrors every
  base variant at the owner's price difference, with the same photographs,
  made to order, and its own diamond record carrying the weight - so the
  product page, the cart and the order all state the chosen size. The page
  says the photographs illustrate the design. Withdrawing a size archives its
  variants; offering it again brings them back. No sizes or prices were
  invented: the owner adds them.

## D4D.25 — 14 karat only; new products and photographs from the admin

**14K only.** The owner's decision: every piece is sold in 14 karat, and 18
karat is a custom request. `scripts/fourteen-karat-only.ts` (dry run by
default) makes the catalogue say so:

- Pieces offered in 14K and 18K: the 18K variants are archived, never
  deleted, and the 18K values switched off.
- Eight pieces were offered ONLY in 18K (three-piece bridal set, coloured
  diamond ring, comfort band, rigid diamond bracelet, diamond hoops,
  emerald-cut ring, pear solitaire, wide gold band). Archiving would have
  left them unbuyable, so their variants were relabelled 14K in place - same
  ids, photographs and diamonds - **at the price they had as 18K**. The
  script prints them; the 14K price is the owner's to set in the admin.
- The FAQ answer on 14K vs 18K now says the shop makes 14K and links to a
  custom request for 18K; the one description offering "14 או 18 קראט" is
  reworded. A filter with a single value is no longer drawn, which removes the
  karat filter everywhere.
- It is a catalogue change: run it on production too.

**New products** (`/admin/products/new`): name, sub-category, gold colours,
one price, lead time, descriptions, an optional diamond, an optional English
address. Built like every catalogue product - 14K, one made-to-order variant
per colour, ring sizes or lengths from the catalogue's own lists - and
created hidden: it cannot be shown without at least one photograph.

**Photographs**, in groups the owner thinks in: one per gold colour (rows on
every live variant of that colour) and one for all colours (the product-level
rows the card and the fallback use). Upload, order, mark as a simulation,
remove. The browser downscales each photograph to 2400px and a JPEG under
4MB - phone photographs are larger than Vercel's request ceiling - and the
server checks the file's own first bytes before putting it to storage
through the existing presigned path, so no bucket CORS is needed. Removing a
photograph removes its rows only: orders keep the key they were sold with.

## D4D.26 — The atelier: the whole site in design A

The owner chose design A, "סטודיו" (Atelier), from five rendered alternatives
(`docs/design-alternatives/a-atelier.html`) and asked for the whole site in it.
It replaces the paper-and-ink world; DESIGN.md was rewritten from the build.

- **Palette:** ivory `#f4efe6` and a recessed `#ebe4d6`, green-black ink
  `#1d2a24`, forest green `#2f4a3c` as the one colour of action and emphasis,
  a green field band and a night footer.
- **Type:** Frank Ruhl Libre for every heading, at regular weight; Heebo light
  for reading.
- **Shapes:** pill actions and chips; arches on the category and collection
  photographs; one sweeping curve, on the hero photograph only.
- **Home page in A's order:** split hero (line, two pills, curved photograph),
  five arches, best sellers, the workshop on the green field, four order steps,
  bridal, diamonds, collections, FAQ.
- **Kept from A, deliberately not copied:** its small tracked labels above
  headings (dropped: a heading carries itself, and positive tracking breaks
  Hebrew), and its "עבודת יד" (handmade), which is not an established fact.
  Its "14K / 18K" product lines were never data; cards show the catalogue.
- **Photographs:** the existing editorial photographs fit A, which was drawn
  around them; the hero now shows the wide master in an upright column. The
  product packshots are seated into the ivory with `mix-blend-darken`, so no
  cool-white tile shows. Every editorial raster now carries its provenance.
- Reviewed by an independent finish review: seven of eight findings fixed. The
  open one is the best-seller line, kept by the owner's earlier instruction;
  its description ("הדגמים המבוקשים ביותר בקטלוג") is a demand claim while no
  orders exist, flagged for the owner.

## D4D.27 — The home page critique, fixed

An independent two-part critique of the atelier home page (24/36) found it
contradicting itself, with no action on a phone's first screen, and ending on
doubt. All its findings were taken:

- **Truth.** The diamonds band said natural stones were special-order while
  two of the four best sellers above carry them; it now says the catalogue
  holds both and the type is on every model. "קראט" no longer means gold in one
  sentence and diamond in the next: the hero offers "סוג וגודל היהלום", bridal
  "גודל היהלום". The best-seller description stops claiming demand ("דגמים
  נבחרים מהקטלוג"); the heading stays, as the owner asked. The hero action says
  where it goes ("לכל הקטגוריות"). Step 3 says production starts once the order
  is paid - true for every product, where a lead time is set on only 27 of 50.
- **Phone.** The photograph is 46svh and the type a step tighter, so the green
  action sits inside the first screen at 390x844, 390x740 and 375x667; both
  actions are full width.
- **Gifts.** Personalised pieces get their own band after the best sellers;
  the collections band shows only when two or more collections remain.
- **Close.** A closing band on the recessed ivory at finale spacing ends the
  page on the workshop and the catalogue, not on the FAQ. The bridal band links
  to the ring-size answer.
- **Polish.** No double padding between ivory bands; the FAQ on the start edge;
  the diamonds band's FAQ link is a secondary pill; the alteration list said
  once; the footer's lone-privacy column is "מידע"; the wordmark at regular
  weight and its sizes documented.

## D4D.28 — No karat choice anywhere in the copy

The owner: 14K is the standard and there is no choice of karat; anything else
is a custom order. Three texts still offered one:

- The filter panel's note ("אין צורך לסנן לפי גוון זהב, קראט...: כל דגם אפשר
  להזמין בכל אחד מהם") now says every piece is made in 14K, and that colour,
  size and length are chosen on the product page.
- The FAQ question was "מה ההבדל בין 14K ל-18K?"; it is now "באיזה זהב
  מיוצרים התכשיטים?", answered with 14K as the standard and 18K as a custom
  order (home FAQ band too).
- The rings category description offered every model "לפי קראט, גוון זהב
  ומידה"; migration `20261008090000_fourteen_karat_copy` rewrites that sentence
  in the database, so production changes on deploy.

Left as they are, because they already say it: the product page states
"קראט זהב 14 קראט" as a fact with no choice, and its "רוצים גוון זהב, קראט או
מידה אחרים?" line leads to a custom request; the custom-request pages offer
another karat as a custom order.

## D4D.29 — Ten business days for every piece

The owner: production takes 10 business days. Migration
`20261008100000_prep_days_ten` sets `Product.defaultPrepDays = 10` on every
live product and clears the variant-level `prepDays`, so every variant
inherits the one figure and a later change is one edit. The product page now
states it for all 50 pieces (23 stated nothing before); the home page's third
step says it; the admin's new-product form defaults to it. Delivery time after
production is still not set.

## D4D.30 — Every diamond is colour D-F

The owner: all diamonds are stated as colour D-F, colourless. Migration
`20261008110000_diamond_color_d_f` sets `DiamondSpec.color = 'D-F'` on every
product- and variant-level record (28), so the product page, the cart and new
orders carry it; `colorGloss` now glosses a range whose ends share a group, so
the page reads "D-F · חסר צבע". The admin's new-product form defaults to D-F.

Not the coloured-diamond ring: its stone is a yellow fancy colour by design,
which the D-to-Z scale does not describe. It still reads "G" and waits for the
owner's grade.

## D4D.31 — The diamond standard: clarity and finish

The owner's standard for every stone: clarity IF to VS1; round stones Triple
Very Good to Triple Excellent (cut, polish and symmetry); fancy shapes VG/VG to
EX/EX (polish and symmetry, all a fancy shape is graded on). Migration
`20261008120000_diamond_clarity_cut` writes it to every `DiamondSpec` (16 round,
13 fancy). The product page's row is now "חיתוך וליטוש", and the glosses read
ranges: "IF-VS1 · ללא פגמים פנימיים עד פגמים זעירים שנראים רק בהגדלה",
"Triple VG – Triple EX · חיתוך, ליטוש וסימטריה: טוב מאוד עד מצוין". New
products default to IF-VS1 and take the finish standard for their shape when
the field is left empty.

## D4D.32 — Seven pieces that stated no karat

Seven starter products (eternity ring, classic wedding band, gold hoops, name
necklace, diamond pendant necklace, Nova bracelet, ring-and-earrings bridal
set) had no gold_karat option, so the product page, the cart, the order and
the catalogue review file said nothing about the gold. `fourteen-karat-only.ts`
now gives each a 14K option holding the one value, linked to every live
variant (signatures recomputed), so the page states "14 קראט" as a fact. It
runs on production with the rest of that script.

## D4D.33 — Sales, coupons and an announcement bar, run from the admin

The owner asked to run sales from the admin, on a model, a group or the whole
site, plus on-site notices, and coupon codes.

**Sales (`/admin/promotions`).** A `Promotion` is a percentage or a fixed
amount, on the whole site or on chosen products, categories (a parent reaches
its subcategories) or collections, with optional start and end dates read in
Israel time ("until the 20th" runs through the 20th). Each price surface
(card, product page, bag, order) goes through one pure `salePrice`, so the
shown price and the charged price cannot differ. One sale per piece: where
two reach it, the larger discount wins; sales never stack. A percentage sale
price is rounded to a whole shekel, and a price never drops below ₪1.

**An honest struck price.** A crossed-out price now appears only beside a live
sale, and is the regular price. The same migration clears every stored
`compareAtAgorot` (six starter products showed a "was" price with no sale
behind it, which the standing rule against fake urgency and unverifiable claims rules out).

**Coupons (`/admin/coupons`).** The existing `Coupon` model gets an admin and a
field in the bag. A code applies on top of a sale, to the lines it covers at
their sale price; a minimum order is measured on the whole bag; the discount
is rounded to a whole shekel. The total and per-customer limits are counted
from redemptions; the per-customer one is checked by email when the order is
placed, inside the same transaction that records the `CouponRedemption`. The
order keeps the code as typed and the discount; the payment and confirmation
pages show the coupon row.

**The seed's `DEMO10` is retired.** Migration
`20261008140000_retire_demo_coupon` archives it: once the bag accepts codes,
a live development coupon would give anyone 10% off.

**An announcement bar, not a pop-up (`/admin/announcements`).** One line on
the green above the header, with an optional link, shown in its date window;
the newest live one wins. A visitor can close it, and it stays closed in that
browser until a new announcement replaces it. A pop-up was declined: on a
phone it covers the shop, search engines penalise it, and it is hard to make
accessible.

## D4D.34 — A men's department

The owner asked for separate pages for men's jewellery, approved the proposed
list and structure, and asked for its photographs to be generated.

**Structure.** A root category "גברים" (`/men`) with four children: טבעות
לגבר, טבעות נישואין לגבר, שרשראות לגבר, צמידים לגבר (migration
`20261008150000_men_department`). It is in the main navigation with its own
menu, and in the footer. Men's pendants join with the first men's pendant;
until then there is no empty category.

**Membership, not new products.** Ten existing pieces the owner approved are
linked as SECONDARY memberships: the signet and wide band, the three wedding
bands, the link and bar necklaces, the link, rope and tennis bracelets. Their
primary category, canonical URL, variants and photographs are unchanged. The
migration matches each slug with or without the `demo-` prefix production
still carries. In the admin, a product's page has a "מחלקת גברים" control
that puts the piece in one men's category or takes it out.

**The landing.** `/men` is the atelier's grammar on the forest-green field:
the curved hero (Hero gained `assetId`, `tone="field"` and `compact`), one
arch per men's category holding that category's own first piece, a wedding
band for both partners, the signet's engraving on the green, and the full men's
catalogue with its filters and sorting. Every claim is PRODUCT.md's: 14K,
made after the order in the owner's workshop, and the real axes of alteration.
No black and gold. The "all" chip reads "כל התכשיטים לגבר", not "כל הגברים".

**Photographs.** Three generated images (`men-hero`, `men-wedding`,
`men-engraving`), made with `scripts/generate-editorial.ts`: a man's hand
with the signet, two hands with wedding bands, an engraved signet still life.
Hands and objects only; no recognisable person.

**For the owner, not decided here:**
- Ring sizes on the men's rings run 50-56 (the wedding band 48-60). Most men
  wear 58-70; the sizes and their prices are the owner's to add.
- The link bracelet is offered in 40 and 45 cm, which are necklace lengths:
  likely a data error in the starter catalogue.
- The bar necklace and rope bracelet's second photographs are worn by a woman.
- The new men's models proposed to the owner (Cuban, Figaro, rope and franco
  chains, Star of David, "חי" and engraved-plate pendants, cufflinks, a men's
  diamond ring) wait for the owner's confirmation, photographs and prices.

**Unisex pieces worn by a man, in the men's department only.** The owner
noticed that hovering a necklace or bracelet in the men's department showed a
woman wearing it - the piece's own second photograph, right in the women's
categories. Inside the men's department (the landing and its four
categories) a card's hover frame is now the piece worn by a man, for the link
and bar necklaces and the link and rope bracelets; everywhere else, and on the
product page, the piece keeps its own photographs. The four images are static
files (`public/images/men-worn/`, mapped in `src/lib/catalog/men-worn.ts`),
generated from each piece's packshot with fal's flux-2-pro edit model - neck
or wrist only, no face - so they need no storage upload and cannot leak into a
gallery, a cart line or search. A piece made for men, with its own men's
photographs, needs no entry.
