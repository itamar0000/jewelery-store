# TBD REGISTER

**Status:** Phase 1 output. Every item is **unresolved**.
**Source:** Specification §57 (Current Open Decisions), plus gaps surfaced while designing [ARCHITECTURE.md](ARCHITECTURE.md) and [DATA_MODEL.md](DATA_MODEL.md).

Per Development Rule 1, none of these is guessed. Where a *technical* default was needed to keep building, it is stated explicitly along with what it would cost to reverse. Where the decision is a **business** matter, no default was chosen at all.

**Legend**

| Column | Meaning |
|---|---|
| **Blocks** | The earliest phase that cannot complete without this decision |
| **Default** | A reversible technical placeholder, or "none — business decision" |
| **Reversal cost** | What it costs to change the default later |

---

## A. Business decisions

*Nobody but the business owner can answer these. No defaults have been invented.*

| # | Decision | Spec | Blocks | Default | Reversal cost |
|---|---|---|---|---|---|
| B1 | **Payment provider** (Israeli; cards + local methods) | §23, §42 | Phase 6b | none — business decision | n/a — port isolates it |
| B2 | **Invoice / receipt provider** (Israeli accounting service) | §23, §42 | Phase 6b | none — business decision | n/a — port isolates it |
| B3 | **Shipping provider** | §4 | Phase 6a | none — business decision | n/a |
| B4 | **Shipping price and free-shipping threshold** | §4 | Phase 6a | none. Checkout treats shipping as unresolved rather than inventing an amount | n/a |
| B5 | **Delivery SLA** | §4 | Phase 6a | none | n/a |
| B6 | **Low-stock threshold** | §13 | Phase 2 | `null` — **no low-stock message shown at all** until a value is set | Trivial — a config value |
| B7 | **Made-to-order preparation times** per product/variant, and customer-facing wording | §14 | Phase 4 | none. Schema supports per-variant `prepDays`; no durations invented | Trivial — data |
| B8 | **Ring size scale** (Israeli / EU / US) and the offered range | §15 | Phase 4 | none — affects the size guide, which must be factually correct | Moderate — sizes become order data |
| B9 | **Necklace lengths** offered | §16 | Phase 4 | none. §16's 40/45/50cm are illustrative examples, not a decision | Trivial — data |
| B10 | **Bracelet lengths** offered | §17 | Phase 4 | none. §17's 16–19cm likewise illustrative | Trivial — data |
| B11 | **Is size a stocked variant axis or a made-to-order selection?** | §11, §15 | Phase 2 | **STILL OPEN.** Implemented schema supports **both** via `ProductOption.isVariantAxis`; the seed demonstrates size as a selection. **Caveat now that inventory is real:** while size is a selection, per-size stock is impossible by construction — "size 52 in stock, size 58 made-to-order" needs a per-product flip to axis plus variant creation. | Low — per-product data flip, no migration |
| B12 | **Customization fields per product** | §18 | Phase 4 | none. Fields are product data, deliberately not global | Trivial — data |
| B13 | **Final filter list per category** | §10 | Phase 3 | none. Driven by `Category.filterConfig` data | Low — data |
| B14 | **Final collection taxonomy** | §28 | Phase 8 | none | Low — data |
| B15 | **Automatic rules** for New Arrivals / Best Sellers | §28 | Phase 8 | none — "best selling" by what measure, over what window? | Low |
| B16 | **Diamond certificate issuer** | §21 | Phase 2 | Stored as free text, not an enum — an enum would encode an unmade decision | Trivial |
| B17 | ~~Coupon stacking rules~~; do coupons apply to made-to-order items? | §37 | Phase 5 | **STACKING DECIDED (Phase 2B): ONE coupon per order, no stacking.** Enforced by `CouponRedemption.orderId @unique` plus single FKs on `Cart` and `Order` (D2.3). Whether coupons apply to made-to-order items **remains open**. | Low — the applicability question is data/rules only |
| B18 | **Gift navigation structure** (§29 explicitly says do not lock this) | §29 | Phase 8 | none | Low |
| B19 | **WhatsApp business number and placement** | §36 | Phase 3 | none | Trivial |
| B20 | **Product pricing ranges** | §57 | Phase 2 | none | n/a |
| B21 | **VAT rate and business VAT registration status** | §23 | Phase 6a | Rate is **configuration**, stored per order at purchase time. No rate hard-coded | Low — but historical orders keep their own rate |
| B22 | ~~Order number format~~ | §23 | ~~Phase 6a~~ **DECIDED Phase 2B** | **Sequence-backed integer starting at 100001**, separate from `Order.id`, generated as a database default so it cannot be forgotten or raced (D2.2). Accepted tradeoff: a monotonic sequence leaks order volume, which the earlier note wanted to avoid. Display formatting lives in one file, so the visual format stays changeable. | Resolved |
| B23 | **Return / cancellation window** as an operational rule | §52 | Phase 9 | none — see L2 | n/a |

---

## B. Design decisions

*The whole brand identity is open. Architecture is built so this can be answered late.*

| # | Decision | Spec | Blocks | Default | Reversal cost |
|---|---|---|---|---|---|
| D1 | **Brand name** | §2 | Phase 3 | none. Referenced through a single config constant, never hard-coded in copy | Trivial |
| D2 | **Logo** | §2 | Phase 3 | none — placeholder wordmark | Trivial |
| D3 | **Typography** (Hebrew display + body faces) | §2 | Phase 1 | A neutral Hebrew face via `--font-display` / `--font-body` tokens. **Hebrew glyph coverage is a hard requirement** — many display faces lack it | Low — token swap |
| D4 | **Final colour palette** | §2 | Phase 1 | §2's stated direction (white, warm cream, pearl, black type) as CSS custom properties | Low — token swap, no component changes |
| D5 | **Hero creative** | §31 | Phase 3 | none. Layout accommodates image or video without assuming either | Low |
| D6 | **Final homepage section order** (§31 says intentionally flexible) | §31 | Phase 3 | §31's listed sequence, built as reorderable sections | Low |
| D7 | **Photography direction** | §2 | Phase 3 | none. Aspect ratio and cropping conventions must be fixed before bulk shooting | Moderate — reshoots are expensive |
| D8 | **Final homepage and category copy** | §57 | Phase 3 | none — placeholder copy is clearly marked as placeholder | Trivial |
| D9 | **Product image aspect ratio and background standard** | §20, §46 | Phase 2 | none. Needed before catalog photography; affects layout stability (CLS) | Moderate |
| D10 | **Low-stock and made-to-order wording** in Hebrew | §13, §14 | Phase 4 | none — see B6, B7 | Trivial |

---

## C. Infrastructure decisions

*These have reversible technical defaults, chosen so work can proceed.*

| # | Decision | Spec | Blocks | Default | Reversal cost |
|---|---|---|---|---|---|
| I1 | **Image / media storage provider** | §42 | Phase 2 | `StorageProvider` port; local-disk adapter for development only, which **throws in production** | Low — port isolates it; stored keys are provider-neutral |
| I2 | **Email provider** | §42 | Phase 6b | `EmailProvider` port, no implementation | Low |
| I3 | **Managed Postgres host** | §42 | Phase 9 | Docker Postgres 16 locally; production host undecided | Low — connection string only |
| I4 | ~~Money as integer agorot vs `Decimal`~~ | — | ~~Phase 1~~ **CLOSED Phase 2B** | **Integer agorot**, implemented in `@/lib/money` and in every monetary column of the schema (D0.1, D1.4). No `Float` holds money anywhere. | Resolved |
| I5 | **Package manager** | — | Phase 0 | **npm** — the only one installed | Trivial |
| I6 | ~~OneDrive syncing `node_modules` / `.next`~~ | — | ~~Phase 0~~ **CLOSED Phase 0** | The working copy lives at `C:\dev\אתר חנות תכשיטים`, outside the OneDrive root (D0.3). A stale copy of the specification documents remains on the OneDrive Desktop and should be deleted. | Resolved |
| I7 | **Error monitoring provider** | §46 | Phase 9 | none | Low |
| I8 | **Analytics accounts** (GA4 / GTM / Meta Pixel IDs) | §45 | Phase 9 | `track()` wrapper, no vendor wired | Low |
| I9 | **Semantic search timing and provider** | §27 | P2 | Postgres trigram behind `SearchProvider`. **Postgres ships no Hebrew text-search configuration**, so trigram + a curated synonym table is the MVP approach | Low — port isolates it |
| I10 | **Background job runner** for invoicing and email retries | §42 | Phase 6b | none. Vercel cron or a queue; depends on I2/B2 | Low |
| I11 | **Guest cart and guest customer retention period** | §48, §52 | Phase 9 | none — a privacy decision as much as a technical one | Low |
| I12 | **Staging environment** | — | Phase 9 | none. Recommended before payment testing | Low |

---

## D. Legal / compliance decisions

*§52 is explicit: legal text must not be authored by the development model. Nothing here has been drafted or assumed.*

| # | Decision | Spec | Blocks | Default | Reversal cost |
|---|---|---|---|---|---|
| L1 | **Terms and conditions** | §52 | Phase 10 | none — page structure exists, content must come from the business | n/a |
| L2 | **Returns / cancellation policy** — Israeli consumer protection law sets minimums | §52 | Phase 10 | none | n/a |
| L3 | **Shipping policy** | §52 | Phase 10 | none | n/a |
| L4 | **Warranty policy** | §52 | Phase 10 | none | n/a |
| L5 | **Privacy policy** — must cover the actual data collected, including custom-request uploads | §52 | Phase 10 | none | n/a |
| L6 | **Accessibility statement and target standard.** Israeli regulation (IS 5568, tracking WCAG 2.0 AA) plausibly applies to a commercial Israeli site, but this is a **legal determination, not an engineering one** | §47, §52 | Phase 9 | none. Built to WCAG 2.1 AA practices as an engineering baseline; formal compliance unconfirmed | Moderate if a higher standard is later required |
| L7 | **Cookie / consent requirements** | §52 | Phase 9 | none. Analytics is behind a wrapper so consent-gating can be added without touching call sites | Low |
| L8 | **Invoice / receipt legal workflow** — what constitutes a compliant Israeli receipt | §52, §42 | Phase 6b | none. Architecture delegates to an external provider precisely to avoid asserting compliance | n/a |
| L9 | **Payment terms** | §52 | Phase 6b | none | n/a |
| L10 | **Customer data retention and deletion rights** | §48, §52 | Phase 9 | none. Affects guest records, uploads, and order history — which must be retained for accounting regardless | Moderate |
| L11 | **Lab-grown diamond disclosure requirements** — how lab-grown origin must be stated in Israeli commerce | §21 | Phase 4 | none. Schema carries `isLabGrown`; **required disclosure wording is not invented** | Low |
| L12 | **Marketing consent** for the §51 newsletter | §51 | Post-MVP | none. `marketingOptIn` defaults to `false` and is never implied | Low |

---

## Most urgent items

Ordered by *when the cost of deciding late starts rising*, not by importance:

1. ~~**I4 — money representation.**~~ **Resolved in Phase 2B:** integer agorot, implemented and tested.
2. **B11 — is size a variant axis?** Shapes catalog data entry and the entire admin product form. The schema supports both, but the business needs to answer before catalog work begins.
3. **D3, D4, D9 — typography, palette, image standard.** Needed before catalog photography and before any visual polish; D9 in particular is expensive to change after a hundred products are shot.
4. **B1, B2 — payment and invoicing providers.** Hard blockers on Phase 6b. Israeli provider onboarding involves business verification and can take weeks, so starting the selection early matters more than deciding quickly.
5. **B4, B5 — shipping price and SLA.** Checkout cannot show a total without them.
6. ~~**I6 — OneDrive sync.**~~ **Resolved:** the working copy is outside OneDrive.
