# ARCHITECTURE

**Status:** Proposal (Phase 1 — no application code written yet)
**Source of truth:** [MASTER_SPECIFICATION.md](MASTER_SPECIFICATION.md)
**Scope:** This document proposes the technical architecture. It does not resolve business decisions. Everything unresolved lives in [TBD.md](TBD.md).

---

## 0. Repository state at time of writing

The repository is **empty apart from the specification**. There is no `package.json`, no framework, no TypeScript config, no Tailwind config, no database configuration, no environment files, no application structure, and no dependencies. Git is not initialized.

Every decision below is therefore greenfield. Nothing here works around existing code.

### Verified local toolchain

| Tool | Result |
|---|---|
| Node.js | v24.14.1 |
| npm | 11.11.0 |
| pnpm / yarn | not installed |
| git | 2.45.1 (repository **not** initialized) |
| Docker | 29.7.2 |
| PostgreSQL client (`psql`) | not installed |

### Two environment observations

1. **The project path contains Hebrew characters and lives inside OneDrive:**
   `C:\Users\olete\OneDrive\Desktop\אתר חנות תכשיטים`

   Node executes correctly from this path — verified empirically. The residual risk is not Node but **OneDrive continuously syncing `node_modules` and `.next`**, which causes file-locking and rebuild slowdowns on Windows. That risk was not empirically tested.

   *Mitigation (deferred to the user, not actioned):* exclude `node_modules/` and `.next/` from OneDrive sync, or move the working copy outside OneDrive. Recorded in TBD.md.

2. **No local PostgreSQL is installed.** Docker is available, so local development can run Postgres in a container. Recorded as a defaulted infrastructure decision below.

---

## 1. Guiding architectural principles

These follow from Specification §43 (Data Model Principles), §55 (Development Rules) and §53 (Non-Goals).

1. **Ports over integrations.** Payments, invoicing, email, storage, and search each sit behind a narrow interface (a "port"). No provider is chosen yet and none is implemented in Phase 1. The application depends on the interface, never on a vendor SDK.
2. **No fake integrations.** Per Rule 5, a port with no chosen provider gets *no* default implementation that pretends to succeed. Where a development stand-in is unavoidable it is named `Mock*`, is refused in production by an explicit environment guard, and logs loudly.
3. **The server is authoritative.** Price, discount, inventory, and availability are always recomputed server-side. Client-submitted money or stock values are never trusted (§48).
4. **Historical immutability.** Orders snapshot everything they need. Editing a product never rewrites history (§43.8–43.12, Rule 6).
5. **Reversible defaults.** Where the specification is silent on a *technical* matter, the cheapest-to-reverse option wins, and the reversal cost is stated.
6. **RTL is structural, not a skin.** Hebrew RTL is the default direction of the entire customer-facing application, not a stylesheet applied afterwards (§49).
7. **Simplicity first.** One deployable Next.js application. No microservices, no message bus, no separate API service. The catalog is ~100 products (§5); the architecture must not exceed that reality.

---

## 2. Decision summary

| Area | Decision | Reversibility |
|---|---|---|
| Framework | Next.js 15, App Router | Low — foundational, mandated by §42 |
| Language | TypeScript, `strict: true` | Low — foundational |
| Styling | Tailwind CSS v4 + CSS design tokens | Medium |
| Database | PostgreSQL | Low — mandated by §42 |
| ORM | Prisma | Low — mandated by §42 |
| Auth | Auth.js (NextAuth v5) — Google + Credentials | Medium |
| Package manager | npm | High — the only manager installed |
| Local database | Docker Compose Postgres 16 | High |
| Money representation | Integer agorot (`Int`) | **Low — decide before any data exists** |
| Media storage | Port only, provider TBD | High by design |
| Payments | Port only, provider TBD | High by design |
| Invoicing | Port only, provider TBD | High by design |
| Email | Port only, provider TBD | High by design |
| Search | Postgres trigram behind a `SearchProvider` port | High by design |
| Admin | Route group inside the same Next.js app | Medium |
| Testing | Vitest (unit/integration) + Playwright (e2e) | High |

---

## 3. Frontend architecture

### 3.1 Framework and rendering

**Next.js 15 App Router with TypeScript** (§42).

Rendering strategy per surface, chosen for SEO (§44) and performance (§46):

| Surface | Strategy | Why |
|---|---|---|
| Homepage | Static + incremental revalidation | Content changes rarely; must load fast |
| Category / collection pages | Server-rendered and cached; filters via URL search params | Filter state must be crawlable, shareable, and back-button correct |
| Product page | Static generation per product, revalidated on admin edit | Highest SEO value; ~100 products is trivial to pre-render |
| Cart / checkout / account | Dynamic, never cached | Per-user; correctness over speed |
| Admin | Dynamic, `no-store` | Always fresh |

**Server Components by default.** Client Components only where interactivity genuinely requires them: variant selector, gallery, filter drawer, cart drawer, search overlay, mega menu, custom-request form. This serves §46's "minimal JavaScript where unnecessary".

**Filter and sort state lives in the URL**, not in React state. A filtered category view must be linkable and indexable.

### 3.2 RTL foundation (§49)

RTL is established once, at the root, and never re-litigated per component:

- `<html lang="he" dir="rtl">` is the application default.
- **All directional styling uses CSS logical properties.** Tailwind logical utilities only: `ms-*`/`me-*`, `ps-*`/`pe-*`, `start-*`/`end-*`, `text-start`/`text-end`, `border-s`/`border-e`. Physical utilities (`ml-*`, `pr-*`, `left-*`, `text-left`) are **forbidden in customer-facing code** and should be blocked by an ESLint rule, so the constraint is enforced by tooling rather than by discipline.
- **Directional icons** (chevrons, back arrows, carousel controls) mirror with the writing direction. Non-directional icons (cart, heart, search) never mirror.
- **Numerals, prices, and dates** are formatted through a single `formatPrice` / `formatDate` helper using `Intl.NumberFormat('he-IL', { currency: 'ILS' })`. Formatting is never done ad hoc, so currency presentation stays consistent everywhere.
- **Mixed-direction text** — `14K`, `VS1`, `Rose Gold` inside a Hebrew sentence, per §49 — is wrapped in a `<Bidi>` component applying `dir="ltr"` with proper isolation. This prevents the well-known bidi punctuation-drift bug where a trailing period or parenthesis jumps to the wrong end of the line.
- **Admin may be LTR-tolerant.** §49 requires RTL for the *customer-facing* experience. Admin is internal; it should still be Hebrew, but is not held to the same strictness.

### 3.3 Styling and design tokens

**Tailwind CSS v4** (§42), with palette and typography expressed as **CSS custom properties** in a single token layer.

This matters because brand name, typography, and final palette are all `TBD` (§2, §57). Tokens mean the visual identity can be swapped without touching component code. Components reference `--color-surface`, `--color-ink`, `--font-display` — never a literal hex value or font name.

Initial token values follow the §2 direction (white, warm cream, pearl, black type, generous whitespace) and are explicitly **placeholders pending brand finalization**.

### 3.4 Component organization

```
src/
  app/                        # routes only
    (storefront)/             # RTL customer experience
    (admin)/                  # admin
    api/                      # route handlers (webhooks, uploads, sitemap)
  components/
    ui/                       # primitives: button, dialog, input, select
    product/                  # gallery, variant selector, price, badges
    cart/
    nav/                      # header, mega menu, mobile menu
    admin/
  lib/
    db/                       # prisma client
    money/                    # agorot arithmetic + formatting
    pricing/                  # server-side price & discount computation
    inventory/                # availability resolution
    cart/                     # cart mutation logic
    search/                   # SearchProvider port
    integrations/             # payment / invoice / email / storage ports
    validation/               # zod schemas shared by forms and server
    rtl/
  server/
    actions/                  # server actions (thin; delegate to lib)
```

The rule: **`app/` orchestrates, `lib/` decides.** Business logic never lives in a route file, so it stays unit-testable without a request.

### 3.5 Accessibility (§47)

Accessible dialogs, menus, and comboboxes are notoriously hard to get right by hand. Build `components/ui/` on **Radix UI primitives**, which supply focus trapping, keyboard interaction, and ARIA wiring, and are unstyled so they do not fight the brand direction. This is the one dependency recommended specifically to *avoid* hand-rolling accessibility.

The target compliance standard is **TBD**. Israeli accessibility regulation (IS 5568, which tracks WCAG 2.0 AA) plausibly applies to an Israeli commercial site, but that is a legal determination — recorded in TBD.md rather than assumed here.

---

## 4. Backend architecture

**Next.js backend — no separate service.** §42 permits either; §53 warns against over-engineering.

Three entry points, each with a distinct role:

1. **Server Components** — read paths. Query the database directly.
2. **Server Actions** — customer mutations (add to cart, apply coupon, submit custom request). Thin wrappers: authenticate, validate with zod, delegate to `lib/`, revalidate.
3. **Route Handlers (`app/api/`)** — anything needing a real HTTP contract: payment webhooks, upload signing, sitemap, robots.

### Cross-cutting rules

- **Every mutation validates input with a zod schema on the server.** The same schema powers the client form, so client and server cannot drift.
- **Authorization is checked server-side on every request**, never inferred from UI state (§48). Admin routes are gated in middleware *and* re-checked inside each admin action — defence in depth, because middleware is easy to misconfigure.
- **Rate limiting** on authentication, coupon application, custom-request submission, and file upload (§48). These are the endpoints where abuse is cheap.
- **Money never touches floating point.** See §6.1.

---

## 5. Database architecture

**PostgreSQL + Prisma** (§42). Entity design is in [DATA_MODEL.md](DATA_MODEL.md); this section covers infrastructure.

- **Local development:** PostgreSQL 16 via Docker Compose. Chosen because Docker is present and `psql` is not; keeps developer setup to one command and matches the production engine.
- **Production:** managed Postgres reachable from Vercel. Provider is **TBD** (Neon, Supabase, and Vercel Postgres are all plausible). Because access is entirely through Prisma over a connection string, this stays highly reversible.
- **Connection pooling:** serverless functions exhaust Postgres connections quickly. Production must use a pooled connection string (PgBouncer-style) with a direct URL reserved for migrations. Prisma supports this split via `url` and `directUrl`.
- **Migrations:** `prisma migrate` with checked-in migration files, applied in CI/deploy, never generated against production. **No migrations are created in Phase 1** — the repository is not yet structured for them, per the Phase 1 instruction.
- **Seeding:** a seed script creates the category tree and a small set of sample products for development. Sample data is clearly fictional and never implies real pricing.

---

## 6. Cross-cutting domain decisions

### 6.1 Money

**All monetary values are stored as integers in agorot** (1 ILS = 100 agorot), typed `Int`, and formatted only at the presentation boundary.

Rationale: floating-point currency arithmetic accumulates rounding error, and percentage-discount coupons (§37) make rounding decisions unavoidable. Integers make rounding explicit and testable. `Decimal` is the alternative — safe, but adds arithmetic ceremony and serialization friction across the server/client boundary.

**This is the least reversible decision in this document** and must be settled before any real data exists. It is flagged in TBD.md for explicit confirmation.

A single `lib/money` module owns all arithmetic, rounding, and formatting. Rounding rule for percentage discounts: round half up to the nearest agora, applied to the line total rather than per unit.

### 6.2 VAT

Israeli consumer prices are customarily displayed VAT-inclusive. The architecture therefore stores a **VAT-inclusive display price**, and records the VAT rate and computed VAT amount **on the order at time of purchase**, so historical orders stay correct when the rate changes.

The rate itself is **not hard-coded as a business fact** — it is configuration. The applicable rate and the business's VAT registration status are TBD (a business and legal matter, not a technical one).

### 6.3 Product / variant / option model

The specification is emphatic that **Product ≠ SKU** (§11) and that inventory, price, images, and availability live at the variant level (§43.1–43.4).

The model uses the standard option/variant structure: a Product has **Options** (Gold Karat, Gold Color, Size, …), each with ordered **Values**; a **Variant** is one combination, carrying SKU, price, inventory, and images.

**One genuinely open question is handled deliberately.** Is ring size a *variant axis* (its own SKU and stock) or a *selection* captured on the line item?

- Treating size as a variant axis multiplies variants sharply — 6 gold combinations × ~15 sizes ≈ 90 variants per ring.
- For made-to-order gold jewelry, sizes are typically produced per order rather than stocked individually.

The specification does not resolve this, so the architecture **supports both** rather than guessing. `ProductOption.isVariantAxis` marks whether an option generates variants (stocked per value) or is a selection recorded on the cart/order line (produced to order). Gold karat and colour default to variant axes; size and length default to selections, and either can be promoted per product without a schema change. **The business rule remains TBD**; the schema keeps both paths open.

### 6.4 Inventory (§13, §14)

Availability is **derived, never stored as a display string**. Given a variant, the resolver returns `IN_STOCK`, `MADE_TO_ORDER`, or `OUT_OF_STOCK`, computed from on-hand quantity, reserved quantity, and the variant's fulfilment policy.

- `availableToSell = onHand − reserved`
- Made-to-order is a **fallback**, exactly as §14 describes: a variant may be out of stock yet still sellable, with a preparation time.
- **Preparation time is per variant** (§14), inheriting from the product when unset.
- **Low-stock messaging is threshold-driven and off by default** (§13). The threshold is `TBD`; until a value is set, no low-stock message is shown at all — silence is the correct behaviour when the rule is undefined.
- **Reservation:** stock is reserved when payment is initiated and released on failure or expiry, preventing overselling between "add to cart" and "paid". Carts themselves never hold stock.

### 6.5 Personalization (§18)

Customization fields are **per-product and configurable** — explicitly not hard-coded globally.

A product owns an ordered set of customization field definitions (type, label, required, max length, allowed values, validation pattern). Submitted values are validated server-side against the definition, stored on the cart item, then **copied immutably onto the order item** at purchase (§43.11, Rule 6). Editing a field definition later never alters a placed order.

---

## 7. Authentication (§24, §25)

**Auth.js (NextAuth v5)** with two providers: **Google OAuth** and **email + password (Credentials)**.

- Sessions are database-backed (Prisma adapter), carried in an `httpOnly`, `Secure`, `SameSite=Lax` cookie.
- Passwords are hashed with **Argon2id** (bcrypt an acceptable fallback). Plaintext passwords are never logged.
- **Guest checkout is a first-class path** (§24). Account creation is *never* required to purchase. The data model reflects this: a `Customer` can exist with no login credentials at all.
- On registration or login, a guest cart — and any guest orders matching the verified email — are **merged** into the account.
- Email verification and password reset both require an email provider, which is TBD. The flows are designed now and implemented when a provider is chosen.

**A naming clarification.** The specification lists both `Customer` and `Account` as entities. Auth.js also defines a table named `Account`, meaning "OAuth provider link". To avoid collision, this architecture uses three distinct concepts, spelled out in DATA_MODEL.md: `User` (login identity), `Account` (OAuth provider link, Auth.js convention), and `Customer` (commercial profile, which may exist without a `User`). This interprets the specification's terms; it does not change their intent.

---

## 8. Storage architecture (§42 — provider TBD)

Media — product images, variant images, video, and **customer uploads on custom requests** — sits behind a `StorageProvider` port:

```ts
interface StorageProvider {
  createUploadUrl(input: { key: string; contentType: string; maxBytes: number }): Promise<UploadTarget>;
  delete(key: string): Promise<void>;
  publicUrl(key: string, transform?: ImageTransform): string;
}
```

Design notes:

- **Uploads go direct from browser to storage** via a short-lived signed URL. Files never pass through the Next.js server, which avoids serverless request-body size limits.
- The database stores **keys, not URLs**, so changing provider does not invalidate every stored row.
- **Customer uploads are untrusted** (§48): content type and size are enforced server-side when the signed URL is issued, files land in a non-executable private namespace, and image dimensions are validated before use.
- **Custom-request uploads are not publicly listable.** They are private business correspondence and are served only to admins through signed, expiring URLs.
- Cloudinary and S3-compatible storage are both viable (§42). The port makes the choice genuinely reversible; the decision stays in TBD.md.

---

## 9. Search architecture (§27)

Search sits behind a `SearchProvider` port from day one, because the specification explicitly anticipates future semantic search:

```ts
interface SearchProvider {
  search(q: string, opts: SearchOptions): Promise<SearchResults>; // products, categories, collections
  suggest(q: string): Promise<Suggestion[]>;
  index(productIds: string[]): Promise<void>;
}
```

**MVP implementation: PostgreSQL.** With ~100 products, a dedicated search service is unjustified (§53).

One technical caveat is worth stating plainly: **PostgreSQL has no built-in Hebrew text-search configuration.** Hebrew stemming and prefix handling are not available out of the box, so a naive `to_tsvector('hebrew', …)` is not an option. The MVP approach is therefore:

- `pg_trgm` **trigram similarity** over a denormalized search document (product name, category, collection, material terms, synonyms). Robust for Hebrew without a stemmer, and tolerant of partial words and typos.
- A `simple`-configuration `tsvector` alongside it for exact token matching.
- A curated **synonym/alias table** mapping Hebrew jewelry vocabulary to catalog terms. At this catalog size, this is where Hebrew search quality is actually won — and it is business-editable rather than code.

Queries such as `טבעת עד 3000` (§27) require **intent parsing** — extracting a price ceiling from natural language. `SearchOptions` accommodates parsed filters, but query understanding is deliberately deferred to P1/P2. MVP handles term matching plus explicit filters.

---

## 10. Payment integration boundary (§23, §42 — provider TBD)

**No payment provider is chosen and none is implemented.** This section defines only the seam.

```ts
interface PaymentProvider {
  createCheckoutSession(order: PaymentIntentInput): Promise<CheckoutSession>;
  verifyWebhook(req: Request): Promise<VerifiedPaymentEvent>;
  refund(paymentId: string, amountAgorot: number): Promise<RefundResult>;
}
```

Boundary rules, all of which hold regardless of which Israeli provider is eventually selected:

1. **Redirect or hosted-fields flow only.** The application never handles raw card numbers and stores no card data (§48). This keeps PCI scope minimal.
2. **The order total is computed server-side** immediately before the payment session is created. A client-claimed total is never used (§48).
3. **The webhook is the source of truth for payment success** — not the browser redirect, which can be lost, replayed, or forged. Webhooks must be signature-verified and processed **idempotently**, keyed on the provider event id, because providers retry.
4. **An order exists before payment**, in `PENDING_PAYMENT` state, so an abandoned or failed payment leaves a diagnosable trail.
5. **Inventory is reserved at payment initiation and released on failure or expiry** (§6.4).
6. Provider-specific identifiers live on a `Payment` record, never smeared across `Order`.

Until a provider is selected, checkout is built up to the hand-off point and the port has **no implementation**. Per Rule 5, there is no fake "payment succeeded" path.

---

## 11. Invoice / receipt integration boundary (§23, §42 — provider TBD)

Per §42, legal invoicing is **not built in-house**. An external Israeli accounting/invoicing service issues documents.

```ts
interface InvoiceProvider {
  issueReceipt(order: OrderInvoiceInput): Promise<IssuedDocument>; // { documentId, url, number }
}
```

Boundary rules:

- Invoicing is triggered **after confirmed payment**, from the webhook handler, and runs as a **retriable background job** — never inline in the customer's response path. A failed invoice must never block the confirmation page.
- The issued document's identifier and URL are stored on the order.
- Issuance is **idempotent per order**; duplicate legal documents are a real accounting problem.
- Failures surface in Admin as an actionable state, never swallowed.

The provider is TBD, and whether a given flow produces a *legally compliant* Israeli receipt is a compliance question recorded in TBD.md — not something this architecture asserts as satisfied.

---

## 12. Email integration boundary (§23, §42 — provider TBD)

```ts
interface EmailProvider {
  send(msg: { to: string; templateId: TemplateId; data: Record<string, unknown> }): Promise<SendResult>;
}
```

- Transactional email only for MVP: order confirmation, password reset, email verification, custom-request acknowledgement.
- **Templates are Hebrew and RTL**, authored as `dir="rtl"` HTML with table-based layout for mail-client compatibility.
- Sending is **queued and retried**, never blocking a request.
- Marketing and newsletter (§31, §51) are a **separate concern with separate consent**, and are out of MVP scope.
- Resend is a plausible provider (§42); the decision remains TBD.

---

## 13. Admin architecture (§40, §41)

**A route group inside the same Next.js application** (`app/(admin)/`), not a separate deployment.

Rationale: one deployment, one schema, one type system, shared validation. A separate admin app would duplicate all of it for no benefit at this scale (§53). If admin later needs independent scaling or a different access boundary, extracting it is a routing change rather than a rewrite.

- **Access control:** a role on the user record (`ADMIN` / `STAFF` / `CUSTOMER`), enforced in middleware *and* re-verified inside every admin action.
- **Admin is uncached and dynamic.**
- **Product management is built for a non-technical owner** (§41): one coherent product form covering general information, pricing, gold options, category-specific specifications, diamonds, inventory, media, and personalization fields — not a raw database editor.
- **Destructive deletion is disallowed** for anything referenced by an order (§43.12). Products are **archived**; the UI offers "Archive", never "Delete".
- **Audit trail:** admin mutations to orders, coupons, and inventory record actor and timestamp. Order status changes are append-only history rather than an overwritten column, so operational disputes are answerable after the fact.
- Custom-request management (§19) is a first-class admin surface implementing the specified workflow states.

---

## 14. Observability, configuration, deployment

- **Hosting:** Vercel (§42).
- **Configuration:** all secrets via environment variables, validated at startup by a **zod schema** that fails fast. A missing payment key should crash the boot, not surface later as a broken checkout. `.env.example` is committed; `.env*` is git-ignored.
- **Environment guard:** any `Mock*` integration throws when `NODE_ENV === 'production'` — Rule 5 enforced mechanically rather than by convention.
- **Error handling:** error boundaries per route segment, Hebrew user-facing error copy, structured server-side logging with no PII or secrets in logs.
- **Monitoring:** error tracking (e.g. Sentry) recommended for Phase 9; provider TBD.
- **Analytics:** GA4 / GTM / Meta Pixel behind a thin `track(event, payload)` wrapper, so a vendor change touches one file (§45). Consent handling depends on the legal determination in TBD.md.

---

## 15. Testing strategy

| Layer | Tool | Covers |
|---|---|---|
| Unit | Vitest | money arithmetic, pricing, coupon rules, inventory resolution, validation schemas |
| Integration | Vitest + test database | Prisma queries, cart mutations, order creation, webhook idempotency |
| End-to-end | Playwright | browse → variant select → cart → guest checkout → confirmation; admin product creation; custom request |
| Accessibility | axe via Playwright | keyboard navigation, dialogs, contrast (§47) |

**Test priority is inverted relative to a typical CRUD app.** The highest-value tests are pricing, coupons, inventory, and order immutability, because those are where silent errors cost real money. UI rendering tests are lower value.

---

## 16. What this architecture deliberately does not do

Per §53 and the Phase 1 instructions:

- No payment integration.
- No invoicing integration.
- No storefront implementation.
- No database migrations — the repository is not yet structured for them.
- No international shipping, loyalty, subscriptions, CRM, multi-vendor, or referral systems.
- No invented business rules. Every gap is recorded in [TBD.md](TBD.md).
