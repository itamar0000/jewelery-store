# IMPLEMENTATION PLAN

**Status:** Proposal (Phase 1). No application code has been written.
**Source of truth:** [MASTER_SPECIFICATION.md](MASTER_SPECIFICATION.md) §54 (MVP priority) and §56 (development phases).
**Companions:** [ARCHITECTURE.md](ARCHITECTURE.md), [DATA_MODEL.md](DATA_MODEL.md), [TBD.md](TBD.md)

---

## How this plan relates to Specification §56

§56 defines ten phases. This plan keeps that sequence and structure, with three deliberate adjustments, each explained where it occurs:

1. **Phase 0 is added** — repository scaffolding. §56's Phase 1 bundles project setup with database and design tokens; separating the scaffold gives a phase that is independently verifiable (`build` and `typecheck` pass on an empty app) before any domain work begins.
2. **Payment (§56 Phase 6) is split** into checkout mechanics and payment integration, because the provider is `TBD`. Everything up to the payment hand-off can be built and tested now; the hand-off itself cannot.
3. **Validation is a gate, not a step.** Per Rule 3, every phase ends with typecheck, lint, test, and build. A phase is not complete while any of those fail.

Two standing constraints apply to every phase below:

- **Rule 5 — no fake functionality.** A phase never ships a stub that appears to work. Where a provider is missing, the feature stops at a clearly-marked boundary.
- **Rule 4 — no regressions.** Each phase re-runs the previous phases' tests.

---

## Dependency graph

```
Phase 0 — Scaffold
   ↓
Phase 1 — Foundation (DB, RTL, tokens, money)
   ↓
Phase 2 — Data model + Admin foundation
   ↓
   ├──────────────┬───────────────┐
   ↓              ↓               ↓
Phase 3        Phase 7         Phase 8
Storefront     Custom Jewelry  Content & Discovery
   ↓
Phase 4 — Product experience
   ↓
Phase 5 — Cart + Accounts
   ↓
Phase 6a — Checkout (no payment)
   ↓
Phase 6b — Payment + Invoice + Email   ← BLOCKED on provider decisions
   ↓
Phase 9 — Production readiness
   ↓
Phase 10 — Full QA
```

Phases 7 and 8 branch off after Phase 2 and can proceed in parallel with the storefront track if capacity allows. Everything else is strictly sequential.

---

## Phase 0 — Repository scaffold

**Objective:** A running, type-safe, empty Next.js application with tooling and CI, committed to git. No domain code.

**Files / components**
- `package.json`, `tsconfig.json` (`strict: true`), `next.config.ts`, `eslint.config.mjs`, `prettier` config
- `src/app/layout.tsx`, `src/app/page.tsx` (placeholder)
- `.gitignore`, `.env.example`, `README.md`
- `.github/workflows/ci.yml`
- `vitest.config.ts`

**Dependencies:** none.

**Database work:** none.

**Testing:** one trivial unit test, to prove the runner is wired.

**Acceptance criteria**
- `npm run build`, `npm run typecheck`, `npm run lint`, `npm test` all pass.
- Git repository initialized; `.env*` and `node_modules/` ignored.
- CI runs all four commands on push.
- The OneDrive/`node_modules` sync question (ARCHITECTURE §0) has been raised with the user and resolved or explicitly accepted.

---

## Phase 1 — Foundation

**Objective:** RTL, design tokens, database connectivity, and money handling — the primitives every later phase depends on. Still no product features.

**Files / components**
- `src/app/layout.tsx` — `<html lang="he" dir="rtl">`, Hebrew font loading
- `src/styles/tokens.css` — palette, typography, spacing as CSS custom properties (placeholder brand values)
- `src/lib/money/` — agorot arithmetic, rounding, `formatPrice` via `Intl.NumberFormat('he-IL')`
- `src/lib/rtl/` — `<Bidi>` component for embedded LTR terms (`14K`, `VS1`)
- `src/lib/env.ts` — zod-validated environment schema, fails fast
- `src/lib/db/prisma.ts` — singleton client
- `prisma/schema.prisma` — datasource and generator only, no models yet
- `docker-compose.yml` — Postgres 16 for local development
- ESLint rule forbidding physical direction utilities in `(storefront)`

**Dependencies:** Phase 0.

**Database work:** connection established and verified. **No models, no migrations.**

**Testing**
- Unit: money arithmetic, percentage rounding at boundaries (0.5 agora cases), ILS formatting.
- Unit: environment schema rejects missing required variables.
- Manual: RTL layout renders correctly; an LTR term inside a Hebrew sentence does not drift.

**Acceptance criteria**
- `prisma db push` connects to the local container.
- Money helpers have full unit coverage, including rounding edges.
- Boot fails loudly and legibly when a required environment variable is absent.
- The physical-utility lint rule fires on a deliberate violation.

**Risk note:** the money representation decision (ARCHITECTURE §6.1) must be confirmed in this phase. It is the cheapest moment to change and becomes expensive immediately after Phase 2.

---

## Phase 2 — Data model + Admin foundation

**Objective:** The full schema from [DATA_MODEL.md](DATA_MODEL.md), plus enough admin to create a real product with variants, inventory, images, and personalization fields.

**Files / components**
- `prisma/schema.prisma` — all entities
- `prisma/seed.ts` — category tree + clearly-fictional sample products
- `src/app/(admin)/**` — layout, auth gate, dashboard shell
- `src/app/(admin)/products/**` — list, create, edit, archive; variant matrix editor; image upload; customization fields
- `src/app/(admin)/categories/**`, `collections/**`
- `src/lib/inventory/availability.ts` — the derived-availability resolver
- `src/lib/validation/**` — zod schemas shared by admin forms and server actions
- `src/lib/integrations/storage.ts` — `StorageProvider` port + local-disk development adapter

**Dependencies:** Phase 1. Admin auth needs a minimal login, so a slice of Phase 5's auth work lands here — deliberately, since admin without authentication is not shippable.

**Database work:** the initial migration. Seed script. `pg_trgm` extension enabled for later search use.

**Testing**
- Integration: create product with two options and six variants; verify variant/option-value wiring.
- Unit: availability resolver across the full matrix — in stock, zero stock with `MADE_TO_ORDER`, zero stock with `DENY`, low-stock with and without a configured threshold.
- Integration: archiving a product referenced by an order is prevented.
- E2E: admin creates a complete product end to end.

**Acceptance criteria**
- Migration applies cleanly to an empty database.
- A non-technical user can create a full product without touching the database (§41).
- Availability is computed, never stored as display text.
- Deletion of order-referenced records is blocked by the database, not just the UI.
- No low-stock message appears when no threshold is configured.

**Note on the storage adapter:** the local-disk adapter is for development only, is named accordingly, and throws in production. The real provider is TBD.

---

## Phase 3 — Storefront shell and discovery

**Objective:** Header, navigation, homepage, category pages, product cards, filters, and basic search. Browsing works; buying does not yet.

**Files / components**
- `src/components/nav/**` — desktop navigation with mega menus (§6: **no hamburger on desktop**), mobile hamburger (§7)
- `src/app/(storefront)/page.tsx` — homepage sections per §31
- `src/app/(storefront)/[category]/**`, `[category]/[subcategory]/**`
- `src/components/product/ProductCard.tsx`
- `src/components/filters/**` — category-aware filters driven by `Category.filterConfig` (§10)
- `src/lib/search/` — `SearchProvider` port + Postgres trigram implementation
- `src/app/(storefront)/search/**` and search overlay

**Dependencies:** Phase 2 (needs real products).

**Database work:** search document generation and trigram indexes; indexes supporting filter and sort paths.

**Testing**
- E2E: navigate through mega menu to a subcategory; apply filters; reload and confirm state restores from the URL.
- E2E: mobile menu at 375px width.
- Integration: Hebrew search returns sensible results for partial words and for the §27 example queries.
- Accessibility: mega menu and filter drawer are fully keyboard-navigable.

**Acceptance criteria**
- Desktop navigation is visible, never a hamburger (§6).
- Filter and sort state lives entirely in the URL and survives reload and back-button.
- Only category-relevant filters render (§10).
- Category pages include all ten elements from §9.
- Hebrew search works for partial words; `טבעת עד 3000`-style intent parsing is explicitly deferred to P1.
- No layout mirroring defects at any breakpoint.

---

## Phase 4 — Product experience

**Objective:** The product page in full — gallery, variants, gold selection, sizes, lengths, personalization, availability, made-to-order.

**Files / components**
- `src/app/(storefront)/product/[slug]/page.tsx`
- `src/components/product/Gallery.tsx` — swipeable on mobile (§50), variant-aware images
- `src/components/product/VariantSelector.tsx` — gold karat/colour, sizes, lengths
- `src/components/product/CustomizationForm.tsx` — dynamic per-product fields (§18)
- `src/components/product/SizeGuide.tsx` — the §15 "How do I know my ring size?" dialog
- `src/components/product/AvailabilityBadge.tsx`
- Information sections and related-products blocks per §20

**Dependencies:** Phase 3.

**Database work:** none beyond query optimization.

**Testing**
- E2E: changing gold colour updates images, price, SKU, and availability (§12).
- E2E: unavailable sizes are visibly unavailable and cannot be selected (§15).
- Unit: customization validation against per-product field definitions, including required fields and max length.
- E2E: made-to-order variant shows preparation time; in-stock variant does not.
- Accessibility: variant selector operable by keyboard, with correct ARIA state.
- Structured data: Product schema validates (§44).

**Acceptance criteria**
- Every axis in §12 changes the variant correctly.
- Customization fields are driven entirely by product data — no hard-coded field lists (§18).
- Availability reflects the derived state, never a stored string.
- Sticky add-to-cart on mobile (§50).
- Selecting a size that does not exist offers the custom-order path (§15).

---

## Phase 5 — Cart, wishlist, accounts

**Objective:** Cart, wishlist, and authentication. Guest identity is established. No checkout yet.

**Files / components**
- `src/lib/cart/**` — server-side cart mutation and total computation
- `src/app/(storefront)/cart/**`, `src/components/cart/CartDrawer.tsx`
- `src/lib/auth/**` — Auth.js configuration, Google + Credentials
- `src/app/(storefront)/account/**` — profile, orders, favourites (§38)
- `src/components/product/WishlistButton.tsx` + the §26 sign-in prompt
- Guest cart cookie handling and merge-on-login

**Dependencies:** Phase 4.

**Database work:** cart, wishlist, session tables exercised. Guest-cart expiry job.

**Testing**
- Integration: cart totals always recomputed server-side; a tampered client price is ignored (§48).
- Integration: guest cart merges into the account on login without duplicating or losing lines.
- Unit: coupon application — validity window, minimum order, usage limits, percentage cap.
- E2E: Google login, email/password login, logout.
- E2E: wishlist prompt for anonymous users does not block browsing (§26).

**Acceptance criteria**
- Cart persists across sessions for guests via cookie and for users via account.
- Cart line displays variant, gold, size/length, and personalization (§22).
- Coupon validation is entirely server-side.
- Password hashing verified; no plaintext password reaches any log.
- Account creation is never forced anywhere in the flow (§24, §38).

---

## Phase 6a — Checkout up to payment hand-off

**Objective:** Everything in checkout that does not require a payment provider: customer information, shipping address, server-side totals, order creation in `PENDING_PAYMENT`, and inventory reservation.

**Files / components**
- `src/app/(storefront)/checkout/**` — information, shipping, review steps
- `src/lib/pricing/computeOrderTotals.ts`
- `src/lib/orders/createOrder.ts` — snapshotting per DATA_MODEL §7
- `src/lib/inventory/reserve.ts`
- `src/lib/integrations/payment.ts` — the `PaymentProvider` port, **interface only**

**Dependencies:** Phase 5.

**Database work:** order and reservation write paths, in a single transaction.

**Testing**
- Integration: order creation snapshots every display field; editing the product afterwards leaves the order unchanged (Rule 6 — this is the highest-value test in the project).
- Integration: reservation decrements availability; release restores it.
- Integration: concurrent checkout of the last unit does not oversell.
- Unit: totals with coupon, shipping, and VAT.
- E2E: guest checkout reaches the payment hand-off point.

**Acceptance criteria**
- Order totals are computed server-side and never accepted from the client.
- An order exists in `PENDING_PAYMENT` before any payment is attempted.
- Editing a product does not alter any existing order — verified by test, not inspection.
- The flow **stops** at the payment boundary with an explicit "provider not configured" state. **No fake success page** (Rule 5).

**Blocked-on note:** shipping price and SLA are `TBD`. Until decided, shipping cost is configuration with no default value, and checkout surfaces it as unresolved rather than inventing an amount.

---

## Phase 6b — Payment, invoice, email

**Objective:** Wire the three external providers. **This phase cannot start until the providers are chosen** (see TBD.md).

**Files / components**
- `src/lib/integrations/payment/<provider>.ts`
- `src/app/api/webhooks/payment/route.ts`
- `src/lib/integrations/invoice/<provider>.ts`
- `src/lib/integrations/email/<provider>.ts` + Hebrew RTL templates
- `src/app/(storefront)/order/[orderNumber]/confirmation/**`

**Dependencies:** Phase 6a **and** three business decisions: payment provider, invoicing provider, email provider.

**Database work:** `Payment` records; invoice fields on `Order`; webhook idempotency index.

**Testing**
- Integration: webhook signature verification rejects forged payloads.
- Integration: duplicate webhook delivery is idempotent — no double payment, no duplicate invoice.
- Integration: failed payment releases the reservation and leaves the order diagnosable.
- E2E against the provider's sandbox: full purchase.
- Manual: Hebrew RTL email renders correctly in major mail clients.

**Acceptance criteria**
- Payment success is determined by the verified webhook, never by the browser redirect.
- No card data is stored anywhere (§48).
- Invoice issuance is idempotent, asynchronous, retriable, and never blocks the confirmation page.
- Confirmation email sends in Hebrew RTL with correct order details.
- A failed invoice surfaces in Admin as actionable, not silently swallowed.

---

## Phase 7 — Custom jewelry requests

**Objective:** The §19 request form, private file upload, and the full admin workflow. Can run in parallel from Phase 2 onward, though it needs email for acknowledgements.

**Files / components**
- `src/app/(storefront)/custom/**` — form and confirmation
- `src/app/api/uploads/custom-request/route.ts` — signed upload issuance
- `src/app/(admin)/custom-requests/**` — review, quote, status transitions

**Dependencies:** Phase 2 (schema, admin, storage port). Acknowledgement email depends on Phase 6b.

**Database work:** `CustomRequest`, `CustomRequestImage`, `CustomRequestEvent`.

**Testing**
- Integration: upload rejects oversized files and disallowed content types (§48).
- Integration: uploaded images are not publicly accessible; admin access is via signed expiring URL.
- E2E: submit a request and see the §19 confirmation message.
- Integration: every §19 status transition is recorded in history.
- Rate limiting: repeated submissions are throttled.

**Acceptance criteria**
- Requests are submittable without an account.
- Uploads are validated server-side and stored privately.
- The admin workflow implements §19's states exactly.
- The form is fully responsive and RTL (§50).

---

## Phase 8 — Content and discovery

**Objective:** P1 features from §54 — collections, guides, FAQ, reviews, bridal, recently viewed.

**Files / components**
- `src/app/(storefront)/collections/[slug]/**`
- `src/app/(storefront)/guides/**`, `faq/**` (§33)
- `src/components/product/Reviews.tsx` + submission form
- `src/app/(admin)/reviews/**` — moderation queue (§34)
- `src/app/(storefront)/bridal/**` (§30)
- Recently-viewed (client-side storage; no personal data server-side)

**Dependencies:** Phase 4.

**Database work:** review aggregation; automatic-collection rules for New Arrivals and Best Sellers.

**Testing**
- Integration: unapproved reviews never appear publicly.
- Integration: rating aggregation counts approved reviews only.
- E2E: moderation approve/reject flow.

**Acceptance criteria**
- Reviews default to pending and require explicit approval (§34).
- Collections are independent of categories and support multi-membership (§28).
- Guides and FAQ are manageable without a deployment.

---

## Phase 9 — Production readiness

**Objective:** SEO, analytics, performance, security, accessibility, error handling, monitoring (§44–§48).

**Files / components**
- `src/app/sitemap.ts`, `src/app/robots.ts`, per-route metadata, JSON-LD for product and breadcrumb
- `src/lib/analytics/track.ts` — thin wrapper over GA4 / GTM / Meta Pixel (§45)
- Rate limiting middleware, security headers, CSP
- Error boundaries with Hebrew copy; monitoring integration

**Dependencies:** Phases 3–8.

**Database work:** index review against real query patterns; slow-query audit.

**Testing**
- Lighthouse on homepage, category, and product pages, mobile profile (§46).
- Automated axe scan across key pages (§47).
- Structured-data validation.
- Security: authorization tests confirming a non-admin cannot reach any admin action directly.

**Acceptance criteria**
- Core Web Vitals within target on mobile (§46).
- Sitemap covers all active products, categories, and collections.
- Every §45 event fires with correct payloads.
- No admin action is reachable without a server-side authorization check.
- Accessibility scan is clean against the standard chosen in TBD.md.

---

## Phase 10 — Full QA

**Objective:** The §56 Phase 10 matrix — desktop, mobile, browsers, variants, inventory, checkout, coupons, guest checkout, login, wishlist, custom requests, admin, error states, empty states, edge cases.

**Dependencies:** all phases.

**Acceptance criteria**
- Every §54 P0 item works end to end.
- Empty states exist for cart, wishlist, search, category, and orders.
- Error states are Hebrew, RTL, and actionable.
- No `Mock*` integration is reachable in production — verified by the environment guard.
- Legal pages are populated with **business-supplied** text (§52 — never model-authored).

---

## Standing validation gate

Run at the end of every phase (Rule 3):

```bash
npm run typecheck && npm run lint && npm test && npm run build
```

Plus, for any phase touching the schema: `npx prisma migrate deploy` against a clean database.

A phase is not complete while any of these fail.
