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
