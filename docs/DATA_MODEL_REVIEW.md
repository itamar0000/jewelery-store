# DATA MODEL REVIEW

**Phase:** 2A — design review only.
**Status:** Recommendations. **Nothing here is implemented.** No Prisma models, no
migration, no seed data were written in this phase.
**Reviews:** [DATA_MODEL.md](../DATA_MODEL.md)
**Against:** [MASTER_SPECIFICATION.md](../MASTER_SPECIFICATION.md) (source of truth),
[ARCHITECTURE.md](../ARCHITECTURE.md), [TBD.md](../TBD.md),
[DECISIONS.md](DECISIONS.md)

Findings are numbered **F1–F26** and referenced throughout. Severity:

|                 | Meaning                                                             |
| --------------- | ------------------------------------------------------------------- |
| **Blocking**    | Phase 2B cannot produce a correct schema without resolving this.    |
| **Correctness** | Schema would compile and run, but produce wrong data or lose money. |
| **Robustness**  | Works today; expensive to retrofit later.                           |
| **Cosmetic**    | Tidiness. Fix while nearby.                                         |

Three claims below were verified empirically against the running PostgreSQL 16
container rather than asserted from memory; those are marked **[verified]**.

---

## 1. What is correct in the existing model

The model is well-built. Most of it should survive review unchanged, and several
decisions in it are better than the obvious alternative.

**The product/variant/option core is right.** `Product` → `ProductOption` →
`ProductOptionValue` → `ProductVariant` → `VariantOptionValue` is the standard
commerce shape and it satisfies §11's `Product != SKU` principle directly.
Variant-level `sku`, `priceAgorot`, `prepDays`, `Inventory` and `images` cover
every bullet in §11 and §12. Gold karat and colour are **data in
`ProductOptionValue`, not enum members** — correct, and it means adding 9K or
platinum is a row, not a migration.

**`isVariantAxis` is the right answer to the ring-size question.** It lets an
option be either a stocked axis or a recorded selection, per product, as data.
That is precisely how to hold TBD.md **B11** open without guessing (see §11).

**Nullable `ProductImage.variantId` is exactly §43.3**, and the documented
fallback (variant images, else product images) is the correct resolution order.

**`DiamondSpec` as a separate optional table** rather than a dozen nullable
columns on the variant is right for §21's "optional when not relevant" — an
absent row says "no diamond" far more honestly than twelve nulls. (Its
_attachment point_ is wrong — see F6 — but the separation is correct.)

**`CustomizationField` per product** implements §18's explicit "do not hard-code
customization fields globally" instruction properly.

**The order snapshot design is the strongest part of the document.** Duplicating
every display field onto `OrderItem` — `productNameHe`, `variantLabelHe`, `sku`,
`goldKarat`, `goldColor`, `sizeValue`, `lengthValue`, `imageKey`,
`unitPriceAgorot`, `customization`, `diamondSnapshot`, `productSnapshot` — plus
`onDelete: Restrict` on the product and variant FKs, is what makes §43.8–43.12
and Rule 6 structural rather than aspirational. Rendering an order never joins
back to `Product`. That is the correct instinct, and the one gap in it (F14) is
narrow.

**Address and contact details are snapshotted onto `Order`, not referenced.**
Correct: a customer editing their address must not rewrite where a past order
was shipped.

**`Customer.userId` nullable is what makes guest checkout structural** (§24)
rather than a special case, and the note that `Customer.email` is deliberately
**not** unique is right — forcing uniqueness would make a second guest purchase
fail.

**The cart stores no prices.** Correct per §48. A cart that cached prices would
silently sell at stale amounts after a price change.

**`CouponRedemption` as the authoritative usage record** rather than a bare
counter is the right call, and the document's own reasoning for it is sound.
(It then also keeps the counter — see F10.)

**`Payment.providerEventId @unique` for webhook idempotency**, an order existing
in `PENDING_PAYMENT` before payment, and `Review.status` defaulting to `PENDING`
so moderation is not cosmetic, are all correct.

**Money is `Int` agorot throughout**, with percentage discounts in basis points.
Consistent with D0.1/D1.4 and verified below (§7).

---

## 2. Problems and ambiguities found

### Blocking

**F1 — `ProductCategory` is referenced but never defined.**
`Category.extraProducts ProductCategory[]` and `Product.categories
ProductCategory[]` both point at a model that has no `model ProductCategory`
block anywhere in DATA_MODEL.md. The prose describes it; the schema omits it.
Phase 2B must define it.

**F2 — `CustomRequestEvent` is referenced but never defined.**
Same problem: `CustomRequest.events CustomRequestEvent[]` and a paragraph
describing it, with no model block.

**F5 — `ProductOption @@unique([productId, type])` allows only one `OTHER`
option per product.** `OptionType` has a catch-all `OTHER`, but the unique
constraint means a product can carry exactly one of them. §10 lists **Style**
_and_ **Pendant type** as filters for necklaces — two non-standard options on
one product, which this constraint forbids. The uniqueness key is wrong: it
should be a stable per-product `code`, with `type` demoted to a non-unique
classifier used for UI treatment and filtering.

### Correctness

**F3 — Nothing prevents two variants with identical option combinations.**
`VariantOptionValue` has primary key `[variantId, valueId]`, which constrains
_a variant's_ values but says nothing about _combinations across variants_. Two
"14K / Yellow Gold" variants of the same product can coexist, each with its own
SKU, price and stock. The variant selector would then have two identical
choices, and inventory would be split silently between them. This is not
expressible as a plain unique constraint and needs a denormalised signature
column (see §4).

**F4 — A variant can reference another product's option value.**
`VariantOptionValue.valueId` points at `ProductOptionValue` with no scoping back
to the owning product. Nothing at the database level stops variant A of product
X from being assigned an option value belonging to product Y.

**F6 — `DiamondSpec` is variant-scoped only, forcing duplication.**
`DiamondSpec.variantId String @unique` means a ring with six gold variants
carries **six identical copies** of the same 0.5ct / VS1 / Round diamond data.
Every edit must touch six rows, and they will drift. §21 describes diamond data
as a property of the _product_; §11 allows variants "possibly different
technical specifications", so a variant-level override is legitimate — but it is
the exception, not the storage model.

**F7 — Inventory reservation is an unowned counter. This is the most serious
finding.**
`Inventory.reserved Int` is incremented at payment initiation and decremented on
failure or expiry (ARCHITECTURE §6.4). But the counter has no owner, no expiry
and no history, so the system cannot answer:

- _which_ checkout holds a given reservation;
- whether a reservation has expired and should be released;
- whether a crashed or abandoned checkout already reserved (so retrying does not
  double-reserve);
- how `reserved` reached its current value when it inevitably drifts.

In practice `reserved` ratchets upward on every abandoned payment and never comes
back down, and stock silently disappears. There is also no constraint preventing
`reserved > onHand`, so a bug oversells rather than failing. See §6 for the fix.

**F9 — The wishlist uniqueness constraint does not work. [verified]**
`@@unique([wishlistId, productId, variantId])` with a nullable `variantId`.
PostgreSQL treats NULLs as distinct in unique indexes by default, so a
product-level favourite (`variantId = NULL`) can be inserted unlimited times.
Verified on the project's PostgreSQL 16:

```
default UNIQUE (wishlist, product, variant):     2 rows accepted  ← duplicate
UNIQUE NULLS NOT DISTINCT (...):                 1 row, second rejected
```

`NULLS NOT DISTINCT` (PostgreSQL 15+) fixes it and is available on our 16.
**Prisma 7.10 PSL does not support it [verified]** — `@@unique([...],
nullsNotDistinct: true)` fails validation with `No such argument`. It must be
applied as raw SQL in the migration.

**F10 — `Coupon.timesUsed` duplicates `CouponRedemption` and will diverge.**
The document argues correctly that a counter races and cannot express
per-customer limits, then keeps the counter anyway. Two sources of truth for the
same fact is how a coupon gets honoured past its limit.

**F11 — Two schema details silently decide a TBD.**
TBD.md **B17** leaves coupon _stacking_ undecided. But
`CouponRedemption.orderId @unique` permits exactly one redemption per order, and
`Cart.couponId` is a single nullable FK. Together these decide "no stacking, ever"
at the database level. That may well be the right business rule — but it should
be a stated decision, not an accident of two constraints.

**F12 — Per-customer coupon limits are unenforceable for guests.**
`usageLimitPerCustomer` is checked against `CouponRedemption.customerId`. Every
guest checkout creates a **new** `Customer` row (correctly — F-none, that is the
guest-checkout design). So a guest can reuse a one-per-customer coupon
indefinitely by checking out as a guest each time.

**F13 — `targetCollectionIds String[]` / `targetProductIds String[]` have no
referential integrity.** PostgreSQL arrays cannot carry foreign keys. Archiving
or deleting a product leaves dangling IDs in every coupon that targeted it, and
the coupon engine must defensively filter unknown IDs forever.

**F14 — Personalization snapshots the values but not the labels.**
`OrderItem.customization Json` freezes what the customer typed. It does not
freeze the field _definitions_. If an admin later renames a field
(`"שם"` → `"שם לחריטה"`), reorders fields, or deletes one, the historical order
re-renders with the new labels or with no label at all. §43.11 requires
personalization to be **immutable within the finalized order record**, and the
label is part of what makes the value meaningful. The snapshot must be
self-describing.

**F15 — No snapshot of the personalization surcharge.**
`CustomizationField.priceDeltaAgorot` can add to a line's price, but `OrderItem`
records only `unitPriceAgorot` / `lineDiscountAgorot` / `lineTotalAgorot`. After
the fact there is no way to show the customer, or an accountant, what part of the
price was engraving. Add an explicit snapshot field.

**F16 — `ProductImage.variantId onDelete: SetNull` silently promotes images.**
Deleting a variant converts its variant-specific photos into product-level
gallery images. A white-gold close-up then appears in the yellow-gold gallery.
Cascade is correct here.

**F17 — `CartItem.variantId` declares no `onDelete`.** Prisma's default for a
required relation is `Restrict`, so a live cart item blocks variant deletion —
which is defensible — but the real requirement is that **archiving** a product
must never be blocked by someone's abandoned cart. Cart items must cascade, and
the read path must handle a variant that has since been archived.

**F21 — `CustomRequestStatus` has no `CANCELLED`, and `linkedOrderId` is not a
foreign key.** §19's admin workflow says "Rejected / **Cancelled**", and the
Phase 2A brief repeats "Also support cancellation/rejection". `REJECTED` (we
declined) and `CANCELLED` (the customer withdrew) are different business facts
and reporting will need to separate them. Separately, `linkedOrderId String?` is
a bare string with no relation — a dangling pointer by construction.

### Robustness

**F8 — There are no CHECK constraints anywhere in the model.** Every invariant
is left to application code: prices could go negative, quantities zero,
`rating = 9`, `subtotal - discount + shipping ≠ total`. Prisma cannot express
CHECK constraints in PSL; they must be added as raw SQL migration steps. See §4.

**F18 — `updatedAt` is present on only 5 of 32 models.** Missing from
`Category`, `Collection`, `ProductVariant`, `ProductOption`, `ProductImage`,
`CustomizationField`, `Customer`, `Address`, `Coupon`, `Review` and others.
Several of those are admin-editable records where "when did this last change"
is an operational question. Trivial now, a backfill later.

**F19 — No support for price-range filtering or price sorting.** §10 lists
**Price** as a shared filter and §9 category pages sort by price. Effective
price is `ProductVariant.priceAgorot ?? Product.basePriceAgorot`, so both
operations require a correlated subquery over variants per product. At ~100
products this is survivable, but a denormalised `minPriceAgorot` /
`maxPriceAgorot` on `Product` makes it a plain indexed range scan.

**F20 — Case-insensitive lookups have no normalised column.** `Coupon.code` is
documented as "stored uppercase; compared case-insensitively" and
`Customer.email` needs case-insensitive matching for the guest→account link
described in §5. Both need either `citext` or an explicit normalised column with
its own index; a `LOWER()` comparison without a matching expression index will
not use the unique index.

**F22 — `Order.orderNumber` has no generation strategy.** It is `String @unique`
with a comment describing intent (human-readable, non-sequential-looking, TBD.md
**B22**). Uniqueness under concurrent checkout needs either a database sequence
with formatting, or generate-and-retry on unique violation. Worth deciding
before the first order exists.

**F23 — `InventoryMovement` is recommended in prose but never modelled.** The
document says it is "cheap now and painful to retrofit" and then does not include
it. Agreed with the reasoning; see §6.

**F25 — No search index is specified.** `Product.searchDocument` exists, but
ARCHITECTURE §9's approach (pg_trgm similarity, since PostgreSQL ships no Hebrew
text-search configuration) needs the `pg_trgm` extension and a GIN index, both of
which are migration concerns.

**F26 — Reviews permit unlimited duplicates and `isVerifiedPurchase` is
unlinked.** Nothing stops one customer posting fifty reviews of one product, and
`isVerifiedPurchase Boolean` is set by unstated means with no reference to the
order that justifies it. §34 does not require verified-purchase badging, so the
flag is arguably premature — but if it stays, it should point at an order.

### Cosmetic

**F24 — Webhook idempotency will outgrow `Payment.providerEventId`.** Providers
send events that are not payments (refunds, chargebacks, disputes), and an event
can arrive before its `Payment` row exists. A dedicated processed-events table is
the standard fix. Not needed until Phase 6b; noted so it is not forgotten.

---

## 3. Recommended changes

Grouped by where they land. **None of this is implemented in Phase 2A.**

### New models (5)

| Model                   | Why                                                     | Phase          |
| ----------------------- | ------------------------------------------------------- | -------------- |
| `ProductCategory`       | F1 — referenced, never defined                          | 2B             |
| `CustomRequestEvent`    | F2 — referenced, never defined                          | 2B             |
| `InventoryReservation`  | F7 — gives `reserved` an owner and an expiry            | 2B             |
| `InventoryMovement`     | F23 — append-only stock ledger                          | 2B             |
| `CouponTarget`          | F13 — replaces the two `String[]` columns with real FKs | 2B             |
| `ProcessedWebhookEvent` | F24 — provider-agnostic event dedup                     | **6b, not 2B** |

### Changed models

**`ProductOption`** — replace `@@unique([productId, type])` with
`@@unique([productId, code])`; add `code String`. `type` stays as a non-unique
classifier. (F5)

**`ProductVariant`** — add `optionSignature String`, a canonical
deterministic encoding of the variant's sorted option-value IDs, with
`@@unique([productId, optionSignature])`. This is the only way to make F3
enforceable in the database. It is denormalised and must be recomputed whenever a
variant's option values change; that recomputation belongs in one place in
`lib/`, never in a route handler.

**`DiamondSpec`** — re-scope from variant-only to _either_ level (F6):

```
productId String? @unique     // product-level default
variantId String? @unique     // optional per-variant override
CHECK ((product_id IS NULL) <> (variant_id IS NULL))
```

Nullable `@unique` is exactly right here: PostgreSQL's NULLs-are-distinct
behaviour — the same behaviour that breaks the wishlist in F9 — is what allows
many rows to have `productId = NULL`, while still permitting at most one spec per
product and one per variant. Resolution order: variant spec if present, else
product spec.

**`Product`** — add `minPriceAgorot` / `maxPriceAgorot`, maintained on write
(F19). Add `updatedAt` where missing across the model (F18).

**`ProductImage`** — `variantId` → `onDelete: Cascade` (F16).

**`CartItem`** — `variantId` → `onDelete: Cascade` (F17).

**`Coupon`** — drop `timesUsed` (F10); drop `targetCollectionIds` /
`targetProductIds` in favour of `CouponTarget` (F13); add `codeNormalized` with
its own unique index (F20).

**`CouponRedemption`** — change `orderId @unique` to `@@unique([orderId,
couponId])` so the schema stops deciding B17 (F11); add `customerEmailNormalized`
so per-customer limits survive guest checkout (F12).

**`Customer`** — add `emailNormalized` + index (F20).

**`OrderItem`** — change `customization Json` to a **self-describing** snapshot
(F14) and add `personalizationAgorot Int @default(0)` (F15):

```jsonc
// customization: array, not a key/value map — order and labels are part of the record
[
  { "key": "name", "labelHe": "שם", "fieldType": "TEXT", "value": "מיכל" },
  {
    "key": "lang",
    "labelHe": "שפה",
    "fieldType": "SELECT",
    "value": "he",
    "valueLabelHe": "עברית",
  },
]
```

Storing the label and the display value alongside the raw value is what makes the
order record readable years later without consulting a `CustomizationField` row
that may have been renamed or deleted.

**`CustomRequest`** — add `CANCELLED` to the status enum; make `linkedOrderId` a
real optional relation to `Order` with `onDelete: SetNull` (F21).

**`Review`** — add `orderItemId String?` to justify `isVerifiedPurchase`, and
decide explicitly whether `@@unique([productId, customerId])` applies (F26).

**`Order`** — add `shippingMethodLabel String?` so the chosen shipping option is
snapshotted like everything else. Provider-neutral, so it does not depend on
TBD.md B3/B4/B5.

### Deliberately NOT changed

- **No EAV table.** See §8.
- **No generic audit log.** `OrderStatusEvent`, `CustomRequestEvent` and
  `InventoryMovement` cover the three places where "how did this get here" is a
  real operational question. A universal audit framework is the enterprise
  pattern the brief warns against.
- **No automatic-collection rules engine.** `Collection.isAutomatic` and
  `rules Json` stay as declared, and Phase 2B implements **manual collections
  only**. `rules` stays null until §28's TBD is resolved (TBD.md B15).
- **`Cart` still stores no prices.** Correct as-is.
- **Gold karat/colour stay data, not enums.** Correct as-is.

---

## 4. Important database constraints

The rule: **an invariant that must never be violated belongs in the database.**
Application checks are for producing good error messages; they are not the
guarantee, because they are bypassed by every seed script, admin fix-up and
concurrent request.

Prisma expresses unique constraints and foreign keys. It expresses **neither
CHECK constraints nor `NULLS NOT DISTINCT` [verified]**, so those must be added
as raw SQL steps inside the Phase 2B migration.

### Uniqueness

| Constraint                                                  | Purpose                                | Notes                                            |
| ----------------------------------------------------------- | -------------------------------------- | ------------------------------------------------ |
| `ProductVariant.sku` unique                                 | F-none — already present               | Consider partial: unique among non-archived only |
| `@@unique([productId, optionSignature])`                    | F3 — no duplicate variant combinations | Needs the new signature column                   |
| `@@unique([productId, code])` on `ProductOption`            | F5                                     | Replaces the `type`-based key                    |
| `@@unique([optionId, value])`                               | already present                        | Correct                                          |
| `WishlistItem` unique **`NULLS NOT DISTINCT`**              | F9                                     | **Raw SQL** — Prisma cannot express it           |
| `@@unique([orderId, couponId])`                             | F11                                    | Replaces `orderId @unique`                       |
| `Coupon.codeNormalized` unique                              | F20                                    |                                                  |
| `Payment.providerEventId` unique                            | webhook idempotency                    | already present, correct                         |
| `@@unique([provider, providerRef])`                         | already present                        | Correct                                          |
| `Order.orderNumber` unique                                  | F22                                    | Plus a generation strategy                       |
| `DiamondSpec.productId` / `.variantId` each unique-nullable | F6                                     | At most one spec per level                       |

### CHECK constraints (all raw SQL)

```sql
-- Money is never negative
ALTER TABLE "Product"        ADD CONSTRAINT base_price_non_negative
  CHECK ("basePriceAgorot" >= 0);
ALTER TABLE "ProductVariant" ADD CONSTRAINT variant_price_non_negative
  CHECK ("priceAgorot" IS NULL OR "priceAgorot" >= 0);

-- compare-at must actually be higher, or it is not a comparison
ALTER TABLE "ProductVariant" ADD CONSTRAINT compare_at_above_price
  CHECK ("compareAtAgorot" IS NULL OR "priceAgorot" IS NULL
         OR "compareAtAgorot" > "priceAgorot");

-- Quantities are positive; a zero-quantity line is a deletion, not a row
ALTER TABLE "CartItem"  ADD CONSTRAINT cart_quantity_positive  CHECK ("quantity" > 0);
ALTER TABLE "OrderItem" ADD CONSTRAINT order_quantity_positive CHECK ("quantity" > 0);

-- Inventory can never go negative or oversell a DENY variant   (F7)
ALTER TABLE "Inventory" ADD CONSTRAINT on_hand_non_negative  CHECK ("onHand"   >= 0);
ALTER TABLE "Inventory" ADD CONSTRAINT reserved_non_negative CHECK ("reserved" >= 0);
ALTER TABLE "Inventory" ADD CONSTRAINT deny_cannot_oversell
  CHECK ("policy" <> 'DENY' OR "reserved" <= "onHand");

-- Order arithmetic must add up  (the single most valuable check in the schema)
ALTER TABLE "Order" ADD CONSTRAINT order_total_consistent
  CHECK ("totalAgorot" = "subtotalAgorot" - "discountAgorot" + "shippingAgorot");
ALTER TABLE "Order" ADD CONSTRAINT order_amounts_non_negative
  CHECK ("subtotalAgorot" >= 0 AND "discountAgorot" >= 0
         AND "shippingAgorot" >= 0 AND "totalAgorot" >= 0);
ALTER TABLE "Order" ADD CONSTRAINT discount_not_above_subtotal
  CHECK ("discountAgorot" <= "subtotalAgorot");

-- Coupons
ALTER TABLE "Coupon" ADD CONSTRAINT coupon_value_positive CHECK ("discountValue" > 0);
ALTER TABLE "Coupon" ADD CONSTRAINT percentage_within_range
  CHECK ("discountType" <> 'PERCENTAGE' OR "discountValue" <= 10000);  -- basis points
ALTER TABLE "Coupon" ADD CONSTRAINT coupon_window_ordered
  CHECK ("startsAt" IS NULL OR "endsAt" IS NULL OR "startsAt" < "endsAt");

-- Reviews
ALTER TABLE "Review" ADD CONSTRAINT rating_in_range CHECK ("rating" BETWEEN 1 AND 5);

-- Diamond spec attaches to exactly one level   (F6)
ALTER TABLE "DiamondSpec" ADD CONSTRAINT spec_attaches_to_one_level
  CHECK (("productId" IS NULL) <> ("variantId" IS NULL));
```

The `order_total_consistent` check is worth singling out. It is the last line of
defence against a pricing bug shipping money out of the door, it costs nothing,
and it will catch mistakes that no unit test anticipated.

### Referential behaviour

| Relation                                          | `onDelete` | Reason                                                               |
| ------------------------------------------------- | ---------- | -------------------------------------------------------------------- |
| `OrderItem` → `Product` / `ProductVariant`        | `Restrict` | §43.12 — archive, never delete                                       |
| `Order` → `Customer`                              | `Restrict` | Orders outlive account deletion                                      |
| `Payment` → `Order`                               | `Restrict` | Financial record                                                     |
| `CouponRedemption` → `Coupon`                     | `Restrict` | Was `Cascade`; deleting a coupon must not erase evidence it was used |
| `ProductImage` → `ProductVariant`                 | `Cascade`  | F16                                                                  |
| `CartItem` → `ProductVariant`                     | `Cascade`  | F17                                                                  |
| `ProductVariant` / `Option` / `Image` → `Product` | `Cascade`  | Composition; blocked anyway once ordered                             |
| `CustomRequest` → `Order` (`linkedOrderId`)       | `SetNull`  | F21                                                                  |

Note the change on `CouponRedemption`: DATA_MODEL.md has `onDelete: Cascade`,
which means deleting a coupon deletes the record that it was redeemed — and the
redemption row carries `amountAgorot`, the discount actually granted. That is
financial history. `Restrict` (plus coupon archiving) is correct.

### Not enforceable in the database

Honest about the limits — these need application-level checks in `lib/`:

- **F4**, a variant referencing another product's option value. A composite FK
  through `(productId, valueId)` would work but requires denormalising
  `productId` onto `ProductOptionValue`. Recommended only if it proves a real
  problem; otherwise a service-layer check plus a seed-time assertion.
- **Category tree cycles.** No sane constraint; check on write.
- **`optionSignature` correctness.** The database enforces uniqueness of the
  signature, not that the signature matches the rows. One writer, in `lib/`.

---

## 5. Historical-data strategy

The existing design is correct and needs one repair (F14) plus one addition
(F15).

**The principle:** an order is a _document_, not a view over current data.
Rendering an order must never read `Product`, `ProductVariant`,
`CustomizationField` or `Coupon`.

**Three layers, in order of trust:**

1. **Typed snapshot columns on `OrderItem`** — `productNameHe`,
   `variantLabelHe`, `sku`, `goldKarat`, `goldColor`, `sizeValue`,
   `lengthValue`, `imageKey`, `unitPriceAgorot`, `lineTotalAgorot`, `prepDays`,
   `fulfillment`. These are what the order page and the invoice render from.
   They are typed so they can be queried and aggregated for reporting.
2. **Self-describing JSON snapshots** — `customization` (F14: must carry
   `labelHe` and `fieldType`, not just values), `diamondSnapshot`,
   `productSnapshot`. For data whose _shape_ is per-product and cannot be typed.
3. **Soft FKs** (`productId`, `variantId`, `couponId`) — for reporting joins
   only. `Restrict` on delete. **Never read for display.**

**Archiving, not deletion.** `Product.archivedAt` exists; the same treatment
should extend to `ProductVariant`, `Category`, `Collection` and `Coupon`, since
each can be referenced by history. The admin UI offers "Archive", never "Delete"
(ARCHITECTURE §13). `Restrict` is the database backstop: if someone tries a
destructive delete anyway, PostgreSQL refuses.

Archived records must remain **readable** — an old order links to a product page
that returns 410 Gone or renders read-only, never a 500 caused by a missing row.

**Where snapshots are NOT wanted:** the cart. It holds live references
deliberately, so that a price change or an archived product is noticed _before_
purchase rather than silently honoured.

**Open tension worth naming:** `onDelete: Restrict` on `Order → Customer` and the
guest-data retention question (TBD.md **I11**) point in opposite directions. If a
privacy decision later requires erasing customer records, the answer is
_pseudonymisation_ — blanking name, email and phone on `Customer` while leaving
the order's own contact snapshot and financial totals intact — not deletion.
Recording that now, because the schema shape it implies (contact details
snapshotted onto `Order`, which they already are) is exactly what makes it
possible.

---

## 6. Inventory strategy

This is where the model needs the most work (F7), and where a small amount of
structure prevents a class of bug that is very expensive in a jewelry business:
selling a piece that does not exist.

### Where inventory lives

**On the variant, exactly as proposed.** `Inventory` 1:1 with `ProductVariant`,
per §43.2. No warehouses, no locations, no multi-source allocation — the brief
says not to build warehouse management, and there is one business with one stock
pool.

**Availability stays derived, never stored as text.** The resolver in
DATA_MODEL.md is correct:

```
available = onHand − reserved
available > 0                              → IN_STOCK
available ≤ 0, policy = MADE_TO_ORDER      → MADE_TO_ORDER (show prepDays)
available ≤ 0, policy = DENY               → OUT_OF_STOCK
```

Low-stock messaging fires only when a threshold is configured **and**
`available ≤ threshold`. With no threshold, no message — correct, and it keeps
§13's "should not constantly display low-stock messaging" true by default rather
than by discipline. Threshold value remains TBD.md **B?/§13**.

### The overselling problem, and the fix

A read-then-write reservation (`SELECT available; if (ok) UPDATE reserved + 1`)
is a lost-update race: two checkouts read `available = 1` and both proceed.

**The fix is a single conditional UPDATE**, which PostgreSQL executes atomically
under row-level locking without any explicit `SELECT FOR UPDATE`:

```sql
UPDATE "Inventory"
   SET "reserved" = "reserved" + $qty
 WHERE "variantId" = $variantId
   AND ("policy" = 'MADE_TO_ORDER' OR "onHand" - "reserved" >= $qty);
```

**Zero rows affected means the reservation failed** — the caller aborts checkout
with an availability error. **[verified]** on the project's PostgreSQL 16, with
the CHECK constraints from §4 in place:

```
reserve last unit of a DENY variant   → UPDATE 1   (granted)
second buyer, same last unit          → UPDATE 0   (refused — no oversell)
reserve 5 of a MADE_TO_ORDER variant  → UPDATE 1   (granted past zero stock, by design)
bypass attempt: SET reserved = 99     → ERROR: violates "deny_cannot_oversell"
```

The CHECK is the backstop: even if application logic is bypassed by a script or a
future bug, the database refuses to record an oversold state.

### `InventoryReservation` — giving the counter an owner

`reserved` as a bare integer cannot be released, attributed or reconciled (F7).
Add a row per reservation:

```
InventoryReservation
  id, variantId, orderId?, cartId?, quantity,
  status: HELD | CONSUMED | RELEASED | EXPIRED
  expiresAt, createdAt, updatedAt
  @@index([status, expiresAt])
```

Lifecycle, mirroring ARCHITECTURE §6.4:

| Event                       | Reservation                    | `Inventory`                        |
| --------------------------- | ------------------------------ | ---------------------------------- |
| Payment initiated           | insert `HELD` with `expiresAt` | conditional `reserved += qty`      |
| Payment confirmed (webhook) | `CONSUMED`                     | `onHand -= qty`, `reserved -= qty` |
| Payment failed / abandoned  | `RELEASED`                     | `reserved -= qty`                  |
| `expiresAt` passes          | `EXPIRED` by a sweeper         | `reserved -= qty`                  |

The sweeper is a periodic job that releases expired holds. Without it, `reserved`
only ever grows. `@@index([status, expiresAt])` makes it a cheap query.

**Carts still hold no reservation.** Correct as documented — reservation begins
at payment initiation, so browsing does not lock stock.

### `InventoryMovement` — the ledger

Append-only, one row per change: `variantId`, `delta`, `reason`
(`ADMIN_ADJUSTMENT | SALE | RETURN | RESERVATION_CONSUMED | CORRECTION`),
`actorUserId?`, `orderId?`, `note?`, `createdAt`.

DATA_MODEL.md recommends this and then omits it. It belongs in Phase 2B: the
first time on-hand stock is wrong, the only question that matters is "what
changed it", and without a ledger that question has no answer. It is three
columns of real content and it cannot be reconstructed retroactively.

`Inventory.onHand` stays the fast authoritative counter; the ledger explains it.
(A pure event-sourced stock level would be the over-engineered option, and it is
not recommended.)

### Made-to-order

Nothing structural to change. `InventoryPolicy.MADE_TO_ORDER` plus
`ProductVariant.prepDays ?? Product.defaultPrepDays` covers §14, and
`OrderItem.fulfillment` + `OrderItem.prepDays` snapshot what was promised at
purchase, which is the part that matters for §39 order management. Exact wording
and durations remain TBD.

---

## 7. Pricing strategy

**Confirmed: every monetary value in the model is `Int` agorot.** Audited across
DATA_MODEL.md — `basePriceAgorot`, `compareAtAgorot`, `priceAgorot`,
`priceDeltaAgorot`, `subtotalAgorot`, `discountAgorot`, `shippingAgorot`,
`totalAgorot`, `vatAmountAgorot`, `unitPriceAgorot`, `lineDiscountAgorot`,
`lineTotalAgorot`, `amountAgorot`, `minOrderAgorot`, `maxDiscountAgorot`,
`quoteAgorot`, `budgetAgorot`. No `Float` holds money anywhere. Percentage
discounts are basis-point `Int` (`vatRateBps`, `discountValue`). This matches
D0.1/D1.4 and the implemented `@/lib/money`.

The one `Decimal` uses — `ProductVariant.weightGrams`, `DiamondSpec.caratWeight`
— are physical measurements, not money. Correct.

**Effective price resolution:** `ProductVariant.priceAgorot ?? Product.basePriceAgorot`.
Keep the nullable-inherit design: it makes "one price for all six gold variants"
a single edit, which matters for §41's non-technical owner. Add
`min/maxPriceAgorot` on `Product` for filtering and sorting (F19).

**Compare-at** exists at both levels per §41, with a CHECK that it exceeds the
actual price (§4). A compare-at _below_ the price is a data-entry error that
would render as a fake discount.

**All computation is server-side and happens in `@/lib/money`.** Never in a route
handler, never in a component, never from a client-submitted value (§48). The
order of operations is fixed by ARCHITECTURE §6.1 and must be encoded once:

```
line base      = unitPrice × quantity                    (integer × integer)
line total     = line base + personalization surcharge
subtotal       = Σ line totals
discount       = coupon applied to the SUBTOTAL, rounded half-up once
shipping       = per the shipping decision (TBD.md B4/B5)
total          = subtotal − discount + shipping
```

Rounding happens **once**, on the line total, not per unit — `percentageOf` in
`@/lib/money` already implements exactly this, and its tests cover a case where
the two orders of operation genuinely diverge.

**Historical prices.** `OrderItem.unitPriceAgorot` is frozen at purchase; nothing
in the order render path reads a current price. Add `personalizationAgorot`
(F15). VAT is captured as `vatRateBps` + `vatAmountAgorot` **on the order**, so a
future rate change cannot rewrite past orders — correct, and the rate stays
configuration rather than a code constant (TBD.md **B21**).

**Coupon value semantics** need one clarification in Phase 2B: `discountValue` is
basis points for `PERCENTAGE` and agorot for `FIXED_AMOUNT`, which is a
polymorphic column. It is acceptable — the alternative is two nullable columns —
but the meaning must be asserted by the CHECK in §4 and documented at the field.

---

## 8. Product attribute strategy

**Recommendation: typed-first hybrid. Do not build EAV.**

The brief asks for the tradeoff to be evaluated rather than assumed, so here it
is against the three options.

**Option A — a nullable column per attribute on `Product`.**
Rejected. Ring size, diamond shape, carat, colour, clarity, cut, length, pendant
type, style … across five product types produces the "hundreds of nullable
columns" the brief warns about, and every new category needs a migration.

**Option B — full EAV** (`AttributeDefinition` / `AttributeValue` rows).
Rejected. Every faceted query in §10 becomes one self-join per active filter; a
four-filter ring search is a five-way join with no useful index. It also
sacrifices type safety at exactly the layer where §41 needs a non-technical owner
to be prevented from entering a carat weight of `"large"`. EAV earns its cost at
tens of thousands of SKUs with an unbounded attribute space. This catalog is
~100 products (§5) with a _known, small_ attribute space, and §53 explicitly
warns against over-engineering.

**Option C — typed for known axes, constrained JSON for the long tail. Adopted.**

Mapping §10's filter list to where each attribute actually lives:

| §10 filter                                 | Storage                                      | Typed?              |
| ------------------------------------------ | -------------------------------------------- | ------------------- |
| Gold karat, Gold colour                    | `ProductOption` / `ProductOptionValue`       | Yes — relational    |
| Ring size, Length                          | `ProductOption` (axis or selection, per B11) | Yes — relational    |
| Diamond shape, carat, colour, clarity, cut | `DiamondSpec`                                | Yes — typed columns |
| Price                                      | `Product.min/maxPriceAgorot` (F19)           | Yes                 |
| Availability                               | derived from `Inventory`                     | Computed            |
| **Style, Pendant type**                    | `Product.attributes Json`                    | JSON                |
| Personalization (as a facet)               | derived — `CustomizationField` exists?       | Computed            |

**Almost every filter in §10 is already typed.** Once options and `DiamondSpec`
are counted, `attributes Json` carries only _Style_ and _Pendant type_ — a
genuinely small long tail. That is the correct amount of generic storage: enough
that a new merchandising facet does not need a migration, small enough that it
never becomes the primary query path.

**Rules that keep the JSON honest** — without these it degrades into an
unqueryable junk drawer:

1. **`attributes` is for facets that have no typed home.** Anything filtered
   heavily, sorted, or arithmetically compared gets promoted to a column.
2. **Allowed keys per category are declared in `Category.filterConfig`** and
   validated server-side with zod on every write. A key not declared for the
   category is rejected. This is the schema-for-the-JSON, and it is data, so §10's
   TBD filter list can be settled without a deployment.
3. **Values are scalars or arrays of scalars only.** No nesting. Nested JSON is
   not usefully indexable.
4. **A GIN index on `attributes`** (`jsonb_path_ops`) so containment queries
   (`attributes @> '{"style":"vintage"}'`) use an index.
5. **`DiamondSpec` is never JSON.** Carat is compared numerically and colour and
   clarity are ordered scales; they must be typed columns.

**Reversibility, which is what makes this safe:** promoting a JSON key to a typed
column later is an additive migration plus a backfill from the JSON — a
half-hour job at 100 products. Retreating from EAV to typed columns is a rewrite
of every query. The cheap-to-reverse direction is the one chosen.

---

## 9. Personalization strategy

The definition side is right; the snapshot side needs the F14/F15 repair.

**Definition — `CustomizationField` per product.** Correct per §18's "do not
hard-code customization fields globally". `key`, `labelHe`, `fieldType`,
`isRequired`, `maxLength`, `options`, `pattern`, `helpTextHe`, `position`,
`priceDeltaAgorot` covers §18's Name / Text / Language / Style examples and
anything else per product. Two products can carry entirely different field sets
because the fields _are_ product data.

**`fieldType` note:** `LANGUAGE` is really a `SELECT` with a fixed option list.
Keeping it as its own type is defensible (it gets a dedicated picker in admin and
possibly a `dir` hint on the input) but it should be documented as a UI
affordance, not a distinct storage shape — otherwise the enum accretes one member
per form control. The exact field taxonomy is TBD (§17 below) and does not block.

**Validation flows one way, always server-side:** the same zod schema is _derived
from_ the `CustomizationField` rows and used both to render the form and to
validate the submission (ARCHITECTURE §4). A client-supplied value is never
trusted, and `pattern` / `maxLength` are enforced on the server.

**Cart — live, by reference.** `CartItem.customization Json` holds validated
values against the current definitions. A cart is pre-purchase, so it should
follow definition changes.

**Order — frozen, self-describing.** This is the F14 repair, and it is the whole
point of §43.11. The snapshot must be an **array of `{key, labelHe, fieldType,
value, valueLabelHe?}`**, not a `{key: value}` map. Reasons:

- **Labels change.** An admin renaming "שם" to "שם לחריטה" must not retitle a
  two-year-old order.
- **Fields get deleted.** A map keyed on `key` renders as a bare orphan value
  with no label once the definition is gone.
- **`SELECT` values are codes.** Storing `"he"` without `"עברית"` means the order
  page cannot render the choice the customer actually made.
- **Order matters.** An array preserves `position` as it was at purchase.

Add `OrderItem.personalizationAgorot` (F15) so the surcharge is auditable
separately from the base price.

**The test that proves this works** (Phase 2B, and it is the important one):
create a product with customization fields, place an order, then rename a field,
delete another, and reorder the rest — the order must render byte-identically.

---

## 10. Custom-request strategy

The model is close to correct and needs two repairs (F2, F21).

**Coverage against §19 and the brief:** customer (`customerId?` + `fullName` /
`email` / `phone`, so an anonymous visitor can submit — correct), jewelry type
(`jewelryType ProductType`), uploaded image (`CustomRequestImage`), description
(`description`), additional details (`extraDetails`), quote (`quoteAgorot`,
`quoteNotes`, `quotedAt`), status, internal notes (`internalNotes`), timestamps
(`createdAt` / `updatedAt`). All present.

**Workflow.** The brief's suggested flow maps onto §19's admin workflow, which
the enum follows verbatim:

```
NEW → REVIEWING → QUOTE_SENT → CUSTOMER_APPROVED → PRODUCTION → COMPLETED
                                   ↘ REJECTED (we decline)
                                   ↘ CANCELLED (customer withdraws)   ← F21, missing
```

`CUSTOMER_APPROVED` is §19's own wording for the brief's `APPROVED`; keeping the
specification's term. **`CANCELLED` must be added** — the brief asks for
cancellation _and_ rejection, and they are different facts that reporting will
need to distinguish.

**`CustomRequestEvent` must actually be defined** (F2): `requestId`,
`fromStatus?`, `toStatus`, `actorUserId?`, `note?`, `createdAt`. §40 requires
admins to track progress and communicate status, and an overwritten status column
cannot answer "when did we send the quote".

**`linkedOrderId` must become a real relation** (F21) to `Order`, `onDelete:
SetNull`. As a bare string it is a dangling pointer, and this is the field that
answers "did custom requests convert into revenue".

**Uploads are private.** `CustomRequestImage.storageKey` in a private namespace,
served to admins only through signed expiring URLs (ARCHITECTURE §8). Correct and
important: these are customer-supplied images that may show personal jewelry or
people. `contentType` and `sizeBytes` are recorded, and both must be enforced
server-side when the signed upload URL is issued, not merely recorded afterwards.

**No messaging/chat**, per the brief. `quoteNotes` and `internalNotes` are
single fields, not a thread. Communication happens by email and WhatsApp (§36)
outside the platform. `CustomRequestEvent.note` gives a lightweight per-transition
record without becoming an inbox.

**Retention.** Custom-request uploads are business correspondence containing
personal images; how long they are kept is TBD.md **I11** and a privacy decision,
not a technical one.

---

## 11. Remaining TBDs

Per the brief: for each, whether the uncertainty **blocks schema design** or can
safely remain flexible.

| #              | Open decision                                                    | Blocks Phase 2B schema?             | How the schema stays neutral                                                                                                                                                                                                                                                                                                                                                                                                                |
| -------------- | ---------------------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **B11**        | **Ring/necklace/bracelet size: variant axis or line selection?** | **No**                              | `ProductOption.isVariantAxis` supports both, per product, as data. `OrderItem.sizeValue` / `lengthValue` are snapshotted either way. Flipping it is a data change, never a migration. **The one caveat:** while size is a _selection_, per-size stock is impossible by construction — if the business later wants "size 52 in stock, size 58 made-to-order", that is a per-product flip to axis plus variant creation, not a schema change. |
| **B13 / §10**  | **Exact filter list per category**                               | **No**                              | `Category.filterConfig Json` is data. The typed attributes already cover almost every filter §10 names (§8). Only _which_ facets a category displays is undecided, and that is editable content.                                                                                                                                                                                                                                            |
| **B12 / §18**  | **Exact customization field taxonomy**                           | **No**                              | Fields are per-product rows. Adding "Style" to one product is a row. The only schema-visible piece is `CustomFieldType`, and `TEXT / TEXTAREA / SELECT / LANGUAGE` covers §18's examples; a new control type is an enum value, which is a cheap migration.                                                                                                                                                                                  |
| **B1 / §23**   | **Payment provider**                                             | **No for 2B. Blocks 6b.**           | `Payment.provider String` + `providerRef` + `providerEventId` are provider-agnostic by construction, and `rawPayload Json` absorbs provider shape. No SDK, no provider-specific column. Per Rule 5 the port stays unimplemented.                                                                                                                                                                                                            |
| **B2 / §23**   | **Invoice provider**                                             | **No**                              | Three nullable columns on `Order` (`invoiceDocumentId`, `invoiceUrl`, `invoiceIssuedAt`). Any Israeli invoicing service returns an id and a URL.                                                                                                                                                                                                                                                                                            |
| **B3–B5 / §4** | **Shipping provider, price and SLA**                             | **No, with one small addition**     | `Order.shippingAgorot` is snapshotted. Add `shippingMethodLabel String?` so the chosen option is recorded like every other order fact. Rates and SLA are configuration and business rules, not schema.                                                                                                                                                                                                                                      |
| **B16 / §21**  | **Certificate provider / issuer**                                | **No**                              | `certificateIssuer String?` is free text, deliberately not an enum — an enum here would encode an unmade decision. `certificateFileKey` holds the document.                                                                                                                                                                                                                                                                                 |
| **B17 / §37**  | **Coupon stacking; applicability to made-to-order**              | **No, but see F11**                 | The schema currently _decides_ "no stacking" via `CouponRedemption.orderId @unique` and a single `Cart.couponId`. Changing to `@@unique([orderId, couponId])` keeps it neutral. Whether that neutrality is worth the extra complexity is itself a decision worth making explicitly in Phase 2B.                                                                                                                                             |
| **B15 / §28**  | **Automatic collection rules**                                   | **No**                              | `Collection.isAutomatic` + `rules Json`. Phase 2B implements manual collections only; `rules` stays null.                                                                                                                                                                                                                                                                                                                                   |
| **B21 / §23**  | **VAT rate and registration status**                             | **No**                              | `vatRateBps` + `vatAmountAgorot` are per-order snapshots. The rate is configuration; no constant is hard-coded.                                                                                                                                                                                                                                                                                                                             |
| **B22 / §23**  | **Order number format**                                          | **Partially**                       | The _format_ is undecided, but the _generation mechanism_ must be chosen before the first order (F22). Recommend: `String @unique` plus generate-and-retry on unique violation, which works for any format the business picks later.                                                                                                                                                                                                        |
| **§13**        | **Low-stock threshold value**                                    | **No**                              | `lowStockThreshold Int?`; null means no message. Correct default behaviour when the rule is undefined.                                                                                                                                                                                                                                                                                                                                      |
| **§15**        | **Ring-size scale (IL / EU / US) and ranges**                    | **No**                              | Sizes are `ProductOptionValue` rows with `value` + `labelHe`. The scale is data. If two scales must be shown simultaneously, that is a label concern.                                                                                                                                                                                                                                                                                       |
| **I11 / §52**  | **Guest data and upload retention**                              | **No, but shapes the erasure path** | See §5: the answer is pseudonymisation of `Customer`, not deletion, and the order-level contact snapshots already make that possible.                                                                                                                                                                                                                                                                                                       |
| **I3**         | **Managed Postgres host**                                        | **No**                              | Connection string only.                                                                                                                                                                                                                                                                                                                                                                                                                     |

**Nothing in the open list blocks Phase 2B.** The two items that need a decision
_inside_ Phase 2B — not from the business, but from us — are F11 (does the
schema permit coupon stacking) and F22 (order-number generation mechanism).

---

## 12. Exact recommended Prisma model list

**37 models, 16 enums.** Legend: **=** unchanged from DATA_MODEL.md · **~**
changed · **+** new · **⊘** deferred past Phase 2B.

### Catalog — 12

|       | Model                | Change                                                                                              |
| ----- | -------------------- | --------------------------------------------------------------------------------------------------- |
| =     | `Category`           | add `updatedAt`                                                                                     |
| **+** | `ProductCategory`    | **F1 — referenced but never defined**                                                               |
| ~     | `Product`            | + `minPriceAgorot`, `maxPriceAgorot` (F19), `updatedAt`                                             |
| ~     | `ProductOption`      | + `code`; `@@unique([productId, code])` replaces `[productId, type]` (F5)                           |
| =     | `ProductOptionValue` |                                                                                                     |
| ~     | `ProductVariant`     | + `optionSignature` with `@@unique([productId, optionSignature])` (F3); + `archivedAt`, `updatedAt` |
| =     | `VariantOptionValue` |                                                                                                     |
| ~     | `ProductImage`       | `variantId` → `onDelete: Cascade` (F16)                                                             |
| ~     | `DiamondSpec`        | re-scoped to product **or** variant level (F6)                                                      |
| =     | `CustomizationField` | + `updatedAt`                                                                                       |
| =     | `Collection`         | + `updatedAt`; `rules` stays null in 2B                                                             |
| =     | `ProductCollection`  |                                                                                                     |

### Inventory — 3

|       | Model                  | Change                                              |
| ----- | ---------------------- | --------------------------------------------------- |
| ~     | `Inventory`            | + CHECK constraints (§4); + `createdAt`             |
| **+** | `InventoryReservation` | **F7 — owner, expiry and lifecycle for `reserved`** |
| **+** | `InventoryMovement`    | **F23 — append-only stock ledger**                  |

### Identity — 6

|     | Model               | Change                                           |
| --- | ------------------- | ------------------------------------------------ |
| =   | `User`              |                                                  |
| =   | `Account`           | Auth.js OAuth link                               |
| =   | `Session`           |                                                  |
| =   | `VerificationToken` |                                                  |
| ~   | `Customer`          | + `emailNormalized` + index (F20); + `updatedAt` |
| =   | `Address`           | + `updatedAt`                                    |

### Cart — 2

|     | Model      | Change                                  |
| --- | ---------- | --------------------------------------- |
| =   | `Cart`     |                                         |
| ~   | `CartItem` | `variantId` → `onDelete: Cascade` (F17) |

### Orders — 5

|     | Model                   | Change                                                                         |
| --- | ----------------------- | ------------------------------------------------------------------------------ |
| ~   | `Order`                 | + `shippingMethodLabel` (B3–B5); + total-consistency CHECK (§4)                |
| ~   | `OrderItem`             | `customization` becomes self-describing (F14); + `personalizationAgorot` (F15) |
| =   | `OrderStatusEvent`      |                                                                                |
| =   | `Payment`               |                                                                                |
| ⊘   | `ProcessedWebhookEvent` | **Phase 6b** — F24, not needed until a provider exists                         |

### Coupons — 3

|       | Model              | Change                                                                                                               |
| ----- | ------------------ | -------------------------------------------------------------------------------------------------------------------- |
| ~     | `Coupon`           | − `timesUsed` (F10); − `targetCollectionIds`/`targetProductIds` (F13); + `codeNormalized`, `archivedAt`, `updatedAt` |
| **+** | `CouponTarget`     | **F13 — real FKs to product/collection/category**                                                                    |
| ~     | `CouponRedemption` | `@@unique([orderId, couponId])` (F11); + `customerEmailNormalized` (F12); coupon FK → `Restrict`                     |

### Custom requests — 3

|       | Model                | Change                                                      |
| ----- | -------------------- | ----------------------------------------------------------- |
| ~     | `CustomRequest`      | + `CANCELLED` status; `linkedOrderId` → real relation (F21) |
| =     | `CustomRequestImage` |                                                             |
| **+** | `CustomRequestEvent` | **F2 — referenced but never defined**                       |

### Community — 3

|     | Model          | Change                                               |
| --- | -------------- | ---------------------------------------------------- |
| ~   | `Review`       | + `orderItemId?` (F26); + `updatedAt`; rating CHECK  |
| =   | `Wishlist`     |                                                      |
| ~   | `WishlistItem` | unique index needs raw-SQL `NULLS NOT DISTINCT` (F9) |

### Enums — 16

`ProductType` · `OptionType` · `CustomFieldType` · `MediaType` · `UserRole` ·
`InventoryPolicy` · `OrderStatus` · `PaymentStatus` · `ItemFulfillment` ·
`DiscountType` · `CouponScope` · `ReviewStatus` ·
`CustomRequestStatus` _(+ `CANCELLED`)_ — plus three new:
**`ReservationStatus`** (`HELD | CONSUMED | RELEASED | EXPIRED`),
**`InventoryMovementReason`** (`ADMIN_ADJUSTMENT | SALE | RETURN | RESERVATION_CONSUMED | CORRECTION`),
**`CouponTargetType`** (`PRODUCT | COLLECTION | CATEGORY`).

**Phase 2B scope: 36 models** (all but `ProcessedWebhookEvent`).

---

## Recommended sequence for Phase 2B

1. Resolve the two decisions that are ours, not the business's: **F11** (does the
   schema permit coupon stacking) and **F22** (order-number generation).
2. Write `schema.prisma` with the 36 models.
3. Add the raw-SQL migration steps Prisma cannot express: every CHECK in §4, the
   `NULLS NOT DISTINCT` wishlist index, `pg_trgm` + the GIN indexes (F25).
4. Seed clearly-fictional data covering the awkward cases: a product with two
   `OTHER` options (proves F5), a made-to-order variant with zero stock, a
   product with customization fields.
5. Write the tests that matter before the admin UI: the availability resolver
   across the full matrix, the conditional-reserve race, and the personalization
   immutability test from §9.
