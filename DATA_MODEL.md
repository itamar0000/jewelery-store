# DATA MODEL

**Status:** IMPLEMENTED (Phase 2B). The schema is live in
[`prisma/schema.prisma`](prisma/schema.prisma) and applied by the migration in
`prisma/migrations/`.
**Source of truth:** [MASTER_SPECIFICATION.md](MASTER_SPECIFICATION.md), especially §11–§21, §37–§39, §43.
**Companions:** [ARCHITECTURE.md](ARCHITECTURE.md), [docs/DATA_MODEL_REVIEW.md](docs/DATA_MODEL_REVIEW.md), [docs/DECISIONS.md](docs/DECISIONS.md)

> ### ⚠ THIS DOCUMENT IS NO LONGER THE SCHEMA
>
> It was the Phase 1 *proposal*. `prisma/schema.prisma` is now the schema, and
> where the two disagree, the Prisma file wins.
>
> The review in [docs/DATA_MODEL_REVIEW.md](docs/DATA_MODEL_REVIEW.md) found 26
> issues here (F1–F26) and the implementation fixes them. The most significant
> divergences from what is written below:
>
> | Below | Implemented | Why |
> |---|---|---|
> | `ProductCategory`, `CustomRequestEvent` referenced but never defined | Both defined | F1, F2 |
> | `ProductOption @@unique([productId, type])` | `@@unique([productId, code])` | F5 — only one `OTHER` option per product was possible |
> | No variant-combination uniqueness | `optionSignature` + `@@unique([productId, optionSignature])` | F3 — duplicate "14K Yellow" variants were possible |
> | `DiamondSpec` variant-only | Product **or** variant, with a CHECK | F6 — six variants stored six identical copies |
> | `Inventory.reserved` a bare counter | `InventoryReservation` rows + `InventoryMovement` ledger | F7 — the counter could not be expired or attributed |
> | `Coupon.timesUsed` counter | Removed; usage derived from redemptions | F10 — two sources of truth |
> | `targetCollectionIds String[]` | `CouponTarget` with real FKs | F13 |
> | `OrderItem.customization` values only | Self-describing array with labels and field types | F14 — renaming a field retitled old orders |
> | Order address inline on `Order` | `OrderAddress` model | D2.1 |
> | Certificate fields on `DiamondSpec` | `DiamondCertificate` model | D2.1 |
> | No CHECK constraints | 35, in raw SQL in the migration | F8, D2.6 |
> | `@@unique` on `WishlistItem` | Raw-SQL index with `NULLS NOT DISTINCT` | F9 — the plain constraint did not work |
> | `Order.orderNumber String` | `Int`, sequence-backed | D2.2 |
>
> Also added: `fulfillmentStatus` on `Order`, `personalizationAgorot` and
> `selections` on `OrderItem`, `min/maxPriceAgorot` on `Product`,
> `emailNormalized` on `Customer`, `codeNormalized` on `Coupon`,
> `customerEmailNormalized` on `CouponRedemption`, `archivedAt` and `updatedAt`
> across the model, and `CANCELLED` on `CustomRequestStatus`.
>
> **Final model list: 38 models, 18 enums.** See `prisma/schema.prisma`.

The schema below is retained as the design rationale — most of the reasoning in
it still holds and is not repeated in the Prisma file.

---

## 1. Modelling rules this schema obeys

Directly from Specification §43:

| # | Rule | How the schema satisfies it |
|---|---|---|
| 1 | Product and Variant are separate | `Product` ↔ `ProductVariant` one-to-many |
| 2 | Inventory belongs at variant level | `Inventory` has a unique FK to `ProductVariant` |
| 3 | Images may belong to product **or** variant | `ProductImage.variantId` is nullable |
| 4 | Pricing may vary by variant | `ProductVariant.priceAgorot` overrides `Product.basePriceAgorot` |
| 5 | Category-specific attributes | typed `DiamondSpec` + flexible `Product.attributes Json` |
| 6 | Customization fields configurable | `CustomizationField` per product |
| 7 | Collections independent of categories | separate `Collection` with its own join table |
| 8–11 | Orders preserve exact configuration; history immutable | `OrderItem` snapshot columns + `productSnapshot Json` |
| 12 | Archive, never destructively delete | `Product.archivedAt`, `onDelete: Restrict` on order references |

Two conventions apply throughout:

- **Money** is `Int`, in **agorot** (1 ILS = 100 agorot). See ARCHITECTURE §6.1. No `Float` ever holds money.
- **Identifiers** are `cuid()`. Sequential integers are avoided for anything customer-visible so catalog and order volume are not leaked. `Order.orderNumber` is the one deliberate exception — a human-readable, non-sequential-looking business reference.

---

## 2. Entity relationship overview

```
Category ──self-referencing tree──┐
    │                             │
    │ primary                     │
    ▼                             │
  Product ──< ProductImage        │
    │  │                          │
    │  ├──< ProductOption ──< ProductOptionValue
    │  │                                  │
    │  ├──< ProductVariant ──< VariantOptionValue
    │  │         │
    │  │         ├── Inventory (1:1)
    │  │         └── DiamondSpec (0:1)
    │  │
    │  ├──< CustomizationField
    │  └──< ProductCollection >── Collection
    │
User ──< Account            (auth identity / OAuth link)
  │
  └── Customer ──< Address
        │  ├──< Cart ──< CartItem
        │  ├──< Order ──< OrderItem
        │  │        ├──< OrderStatusEvent
        │  │        └──< Payment
        │  ├──< Review
        │  ├──< Wishlist ──< WishlistItem
        │  ├──< CouponRedemption >── Coupon
        │  └──< CustomRequest ──< CustomRequestImage
```

---

## 3. Catalog

### Category (§5, §8, §9)

Hierarchical, because the specification's navigation is two-level (Rings → Engagement Rings) and may deepen.

```prisma
model Category {
  id            String     @id @default(cuid())
  slug          String     @unique          // URL segment, §44
  nameHe        String
  descriptionHe String?                     // category intro, §9.3
  parentId      String?
  parent        Category?  @relation("CategoryTree", fields: [parentId], references: [id])
  children      Category[] @relation("CategoryTree")
  position      Int        @default(0)      // manual ordering in nav
  filterConfig  Json?                       // which facets this category shows, §10
  seoTitle      String?
  seoDescription String?
  imageKey      String?                     // storage key, not URL
  isActive      Boolean    @default(true)
  products      Product[]  @relation("PrimaryCategory")
  extraProducts ProductCategory[]
}
```

`filterConfig` implements §10's requirement that filters be **category-aware** — a ring shows diamond shape and ring size; a bracelet shows length. Storing this as data rather than code lets the filter set change without a deployment. The final filter list is `TBD` (§10), and this column is exactly the place it lands.

**Products get one primary category** (which determines canonical URL and breadcrumbs, §44) **plus optional additional categories** via `ProductCategory`. A single primary avoids ambiguous canonical URLs — a real SEO hazard — while the join table still allows a ring to appear under both "Diamond Rings" and "Engagement Rings".

### Product (§11, §41)

```prisma
model Product {
  id                String   @id @default(cuid())
  slug              String   @unique
  nameHe            String
  descriptionHe     String?  @db.Text
  shortDescriptionHe String?

  primaryCategoryId String
  primaryCategory   Category @relation("PrimaryCategory", fields: [primaryCategoryId], references: [id])

  basePriceAgorot   Int                     // fallback when variant has no override
  compareAtAgorot   Int?                    // §41 "compare-at price if needed"

  productType       ProductType             // RING | EARRINGS | NECKLACE | BRACELET | SET | OTHER
  attributes        Json?                   // category-specific facets, §43.5
  hasDiamonds       Boolean  @default(false)

  defaultPrepDays   Int?                    // made-to-order default, §14
  lowStockThreshold Int?                    // null = no low-stock messaging, §13

  isActive          Boolean  @default(false) // draft by default
  archivedAt        DateTime?                // §43.12 — archive, never delete
  publishedAt       DateTime?

  seoTitle          String?
  seoDescription    String?
  searchDocument    String?  @db.Text        // denormalized Hebrew search text, ARCH §9

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  variants          ProductVariant[]
  images            ProductImage[]
  options           ProductOption[]
  customFields      CustomizationField[]
  collections       ProductCollection[]
  categories        ProductCategory[]
  reviews           Review[]

  @@index([primaryCategoryId, isActive])
  @@index([archivedAt])
}
```

`productType` is a coarse enum driving which specification fields and filters apply. It is deliberately separate from `Category`, so the merchandising taxonomy can be reorganized without breaking product logic.

### ProductOption / ProductOptionValue / ProductVariant (§11, §12, §15, §16, §17)

This is the most consequential part of the model. See ARCHITECTURE §6.3 for the reasoning.

```prisma
model ProductOption {
  id            String  @id @default(cuid())
  productId     String
  product       Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  type          OptionType   // GOLD_KARAT | GOLD_COLOR | RING_SIZE | LENGTH | OTHER
  nameHe        String
  position      Int     @default(0)
  isVariantAxis Boolean @default(true)
  values        ProductOptionValue[]

  @@unique([productId, type])
}

model ProductOptionValue {
  id        String @id @default(cuid())
  optionId  String
  option    ProductOption @relation(fields: [optionId], references: [id], onDelete: Cascade)
  value     String         // canonical: "14K", "YELLOW", "52"
  labelHe   String         // display: "זהב צהוב"
  position  Int    @default(0)
  hexColor  String?        // gold-colour swatch
  variants  VariantOptionValue[]

  @@unique([optionId, value])
}

model ProductVariant {
  id             String  @id @default(cuid())
  productId      String
  product        Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  sku            String  @unique
  priceAgorot    Int?                       // null → inherit Product.basePriceAgorot
  compareAtAgorot Int?
  prepDays       Int?                       // null → inherit Product.defaultPrepDays
  weightGrams    Decimal? @db.Decimal(8,3)
  isActive       Boolean @default(true)
  position       Int     @default(0)

  optionValues   VariantOptionValue[]
  inventory      Inventory?
  diamondSpec    DiamondSpec?
  images         ProductImage[]

  @@index([productId, isActive])
}

model VariantOptionValue {
  variantId String
  valueId   String
  variant   ProductVariant     @relation(fields: [variantId], references: [id], onDelete: Cascade)
  value     ProductOptionValue @relation(fields: [valueId], references: [id])
  @@id([variantId, valueId])
}
```

**`isVariantAxis` is the flexibility hinge.** When `true`, the option's values participate in variant combinations and each combination carries its own SKU and stock. When `false`, the option is a **selection** — presented in the same UI, validated the same way, recorded on the cart and order line, but not stocked separately.

This lets gold karat and colour be true variant axes (§12: changing gold changes images, price, SKU, inventory) while ring size and length remain selections for made-to-order pieces (§15, §16, §17) — **without committing to either**, since the business rule is TBD. Flipping an option for a given product is a data change, not a migration.

### ProductImage (§43.3, §20)

```prisma
model ProductImage {
  id        String  @id @default(cuid())
  productId String
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  variantId String?                          // null = product-level image
  variant   ProductVariant? @relation(fields: [variantId], references: [id], onDelete: SetNull)
  storageKey String                          // key, not URL — provider-agnostic
  altHe     String                           // required for §47 accessibility
  width     Int?
  height    Int?
  position  Int     @default(0)
  isPrimary Boolean @default(false)
  mediaType MediaType @default(IMAGE)        // IMAGE | VIDEO, §20

  @@index([productId, position])
  @@index([variantId])
}
```

The nullable `variantId` is precisely §43.3. Gallery resolution: show variant-specific images when a variant is selected, falling back to product-level images.

### DiamondSpec (§21)

Separated into its own optional table rather than nullable columns on the variant, because §21 requires these fields to be **optional when not relevant** — most gold-only pieces have no diamond data at all, and an absent row expresses that more honestly than a dozen nulls.

```prisma
model DiamondSpec {
  id             String @id @default(cuid())
  variantId      String @unique
  variant        ProductVariant @relation(fields: [variantId], references: [id], onDelete: Cascade)
  isLabGrown     Boolean @default(true)      // §21
  caratWeight    Decimal? @db.Decimal(6,2)
  color          String?                     // D–Z
  clarity        String?                     // VS1, VVS2 …
  cut            String?
  shape          String?                     // Round, Oval …
  stoneCount     Int?
  certificateIssuer String?                  // issuer TBD (§21)
  certificateNumber String?
  certificateFileKey String?
}
```

Certificate issuer is `TBD` (§21), so it is stored as free text rather than an enum — an enum would be an invented business decision.

### CustomizationField (§18)

```prisma
model CustomizationField {
  id          String  @id @default(cuid())
  productId   String
  product     Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  key         String                        // stable machine key
  labelHe     String
  fieldType   CustomFieldType               // TEXT | TEXTAREA | SELECT | LANGUAGE
  isRequired  Boolean @default(false)
  maxLength   Int?
  options     Json?                         // allowed values for SELECT
  pattern     String?                       // server-side validation regex
  helpTextHe  String?
  position    Int     @default(0)
  priceDeltaAgorot Int @default(0)          // personalization surcharge, if any

  @@unique([productId, key])
}
```

This satisfies §18's explicit instruction: **do not hard-code customization fields globally.** Submitted values are validated server-side against this definition, then frozen onto the order item.

### Collection (§28)

```prisma
model Collection {
  id            String @id @default(cuid())
  slug          String @unique
  nameHe        String
  descriptionHe String?
  imageKey      String?
  position      Int    @default(0)
  isActive      Boolean @default(true)
  isAutomatic   Boolean @default(false)      // e.g. New Arrivals
  rules         Json?                        // rule set when automatic
  products      ProductCollection[]
}

model ProductCollection {
  productId    String
  collectionId String
  position     Int    @default(0)
  @@id([productId, collectionId])
}
```

Collections are **fully independent of categories** (§43.7) and many-to-many (§28: "a product can belong to multiple collections"). `isAutomatic` accommodates New Arrivals and Best Sellers, which are derived rather than hand-curated; the exact rules are TBD.

---

## 4. Inventory (§13, §14)

```prisma
model Inventory {
  id                String @id @default(cuid())
  variantId         String @unique
  variant           ProductVariant @relation(fields: [variantId], references: [id], onDelete: Cascade)
  onHand            Int    @default(0)
  reserved          Int    @default(0)       // held during payment, ARCH §6.4
  policy            InventoryPolicy @default(MADE_TO_ORDER)
  lowStockThreshold Int?                     // null → inherit product → no message
  updatedAt         DateTime @updatedAt
}

enum InventoryPolicy {
  DENY            // out of stock = unsellable
  MADE_TO_ORDER   // sellable beyond stock, with prep time (§14)
}
```

**Availability is computed, never stored as text:**

```
available = onHand − reserved
available > 0                          → IN_STOCK
available ≤ 0 and policy = MADE_TO_ORDER → MADE_TO_ORDER (show prep time)
available ≤ 0 and policy = DENY          → OUT_OF_STOCK
```

Low-stock messaging fires only when `available ≤ threshold` **and** a threshold is set. The threshold value is `TBD` (§13); with no value configured, no message appears — the correct behaviour when the rule is undefined.

An `InventoryMovement` ledger (append-only: reason, delta, actor, order reference) is **recommended for Phase 2** so stock discrepancies are explainable after the fact. Not strictly required by the specification, but cheap now and painful to retrofit.

---

## 5. Identity and customers (§24, §25, §38)

The specification names both `Customer` and `Account`. Auth.js also uses `Account` for OAuth links. The three concepts are kept distinct (ARCHITECTURE §7):

```prisma
model User {                                 // login identity
  id            String  @id @default(cuid())
  email         String  @unique
  emailVerified DateTime?
  passwordHash  String?                      // null for OAuth-only users
  role          UserRole @default(CUSTOMER)  // CUSTOMER | STAFF | ADMIN
  accounts      Account[]
  sessions      Session[]
  customer      Customer?
  createdAt     DateTime @default(now())
}

model Account {                              // OAuth provider link (Auth.js convention)
  id                String @id @default(cuid())
  userId            String
  user              User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  provider          String                   // "google"
  providerAccountId String
  type              String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  id_token          String? @db.Text
  scope             String?
  token_type        String?
  session_state     String?

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expires      DateTime
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime
  @@unique([identifier, token])
}
```

```prisma
model Customer {                             // commercial profile
  id           String  @id @default(cuid())
  userId       String? @unique               // NULL = guest customer (§24)
  user         User?   @relation(fields: [userId], references: [id], onDelete: SetNull)
  email        String
  firstName    String?
  lastName     String?
  phone        String?
  marketingOptIn Boolean @default(false)     // explicit, never implied
  notesInternal String? @db.Text             // admin-only, §40
  createdAt    DateTime @default(now())

  addresses    Address[]
  orders       Order[]
  carts        Cart[]
  reviews      Review[]
  wishlists    Wishlist[]
  customRequests CustomRequest[]
  redemptions  CouponRedemption[]

  @@index([email])
}
```

**`Customer.userId` being nullable is what makes guest checkout structural** rather than a special case (§24: "must never force account creation"). A guest order creates a `Customer` with no `User`. If that person later registers with the same verified email, the customer record is linked rather than duplicated.

Note `Customer.email` is intentionally **not unique** — the same address may appear on separate guest checkouts before any account exists, and forcing uniqueness would make a second guest purchase fail. Deduplication happens at account-link time.

### Address (§23)

```prisma
model Address {
  id            String  @id @default(cuid())
  customerId    String
  customer      Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)
  fullName      String
  phone         String
  street        String
  houseNumber   String
  apartment     String?
  city          String
  postalCode    String?
  instructions  String?                      // §23 "additional instructions"
  isDefault     Boolean @default(false)
  country       String  @default("IL")       // §4 Israel only, stored for future-proofing
}
```

Fields mirror §23's Israeli address shape (street / house number / apartment / city / postal code). Postal code is optional because it is not reliably known by Israeli customers. Shipping is home delivery only (§4); the provider is TBD.

---

## 6. Cart (§22)

```prisma
model Cart {
  id         String   @id @default(cuid())
  token      String   @unique                // signed cookie value for guests
  customerId String?
  customer   Customer? @relation(fields: [customerId], references: [id], onDelete: SetNull)
  couponId   String?
  coupon     Coupon?   @relation(fields: [couponId], references: [id], onDelete: SetNull)
  items      CartItem[]
  expiresAt  DateTime?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}

model CartItem {
  id            String @id @default(cuid())
  cartId        String
  cart          Cart   @relation(fields: [cartId], references: [id], onDelete: Cascade)
  variantId     String
  variant       ProductVariant @relation(fields: [variantId], references: [id])
  quantity      Int    @default(1)
  selections    Json?                        // non-axis options: size, length (ARCH §6.3)
  customization Json?                        // §18 personalization values
  addedAt       DateTime @default(now())

  @@index([cartId])
}
```

**The cart stores no prices.** Line and cart totals are recomputed server-side on every read and before checkout (§48: never trust client-side pricing). A cart that stored prices would silently sell at stale amounts after a price change.

`selections` and `customization` are JSON because their shape is defined per product by `CustomizationField` and non-axis options; both are validated server-side against those definitions before being written.

A cart holds **no inventory reservation** — reservation happens at payment initiation (ARCHITECTURE §6.4).

---

## 7. Orders (§23, §39, §43.8–43.12, Rule 6)

This is where immutability is enforced.

```prisma
model Order {
  id            String @id @default(cuid())
  orderNumber   String @unique               // human-readable business reference
  customerId    String
  customer      Customer @relation(fields: [customerId], references: [id], onDelete: Restrict)

  status        OrderStatus @default(PENDING_PAYMENT)
  paymentStatus PaymentStatus @default(PENDING)

  // Contact snapshot — frozen at purchase (§43.9)
  email         String
  phone         String
  customerName  String

  // Shipping address snapshot — copied, never referenced
  shipFullName  String
  shipStreet    String
  shipHouseNumber String
  shipApartment String?
  shipCity      String
  shipPostalCode String?
  shipInstructions String?
  shipCountry   String @default("IL")

  // Money — all agorot, all frozen (§43.10)
  subtotalAgorot Int
  discountAgorot Int  @default(0)
  shippingAgorot Int  @default(0)
  totalAgorot    Int
  vatRateBps     Int?                        // basis points, at time of purchase (ARCH §6.2)
  vatAmountAgorot Int?
  currency       String @default("ILS")

  couponId       String?
  coupon         Coupon? @relation(fields: [couponId], references: [id], onDelete: SetNull)
  couponCodeUsed String?                     // snapshot; survives coupon deletion

  invoiceDocumentId String?                  // external invoicing provider (ARCH §11)
  invoiceUrl        String?
  invoiceIssuedAt   DateTime?

  notesInternal  String? @db.Text            // §39
  placedAt       DateTime @default(now())
  updatedAt      DateTime @updatedAt

  items          OrderItem[]
  statusEvents   OrderStatusEvent[]
  payments       Payment[]

  @@index([customerId, placedAt])
  @@index([status])
}

enum OrderStatus {                            // §39 lifecycle
  PENDING_PAYMENT
  PAID
  PROCESSING
  READY
  SHIPPED
  DELIVERED
  COMPLETED
  CANCELLED
  REFUNDED
}
```

`CANCELLED` and `REFUNDED` are added to §39's suggested list because payment failure and refunds are unavoidable operationally; §39 states statuses "may be refined". No other business semantics were invented.

```prisma
model OrderItem {
  id            String @id @default(cuid())
  orderId       String
  order         Order  @relation(fields: [orderId], references: [id], onDelete: Cascade)

  // Soft references — retained for reporting, never used for display (§43.9)
  productId     String?
  variantId     String?
  product       Product?        @relation(fields: [productId], references: [id], onDelete: Restrict)
  variant       ProductVariant? @relation(fields: [variantId], references: [id], onDelete: Restrict)

  // Immutable snapshot — Rule 6
  productNameHe   String
  variantLabelHe  String                     // "14K זהב צהוב"
  sku             String
  goldKarat       String?
  goldColor       String?
  sizeValue       String?
  lengthValue     String?
  imageKey        String?
  customization   Json?                      // §43.11 immutable personalization
  diamondSnapshot Json?                      // §21 specs as sold
  productSnapshot Json                       // full serialized configuration

  quantity        Int
  unitPriceAgorot Int                        // price at purchase (§43.10)
  lineDiscountAgorot Int @default(0)
  lineTotalAgorot Int

  fulfillment     ItemFulfillment            // IN_STOCK | MADE_TO_ORDER
  prepDays        Int?                       // promised at purchase (§14)

  @@index([orderId])
}
```

**Every display field is duplicated onto the order item.** Rendering an order never joins back to `Product`, so renaming a product, changing its price, or archiving it leaves historical orders untouched — §43.8–43.11 and Rule 6, enforced by the schema rather than by convention. The FKs are `onDelete: Restrict`, implementing §43.12's archive-don't-delete rule at the database level.

```prisma
model OrderStatusEvent {                      // append-only audit, ARCH §13
  id        String @id @default(cuid())
  orderId   String
  order     Order  @relation(fields: [orderId], references: [id], onDelete: Cascade)
  fromStatus OrderStatus?
  toStatus   OrderStatus
  actorUserId String?
  note       String?
  createdAt  DateTime @default(now())
}

model Payment {                               // ARCH §10 — provider-agnostic
  id             String @id @default(cuid())
  orderId        String
  order          Order  @relation(fields: [orderId], references: [id], onDelete: Restrict)
  provider       String
  providerRef    String                      // provider transaction id
  providerEventId String? @unique            // webhook idempotency key
  amountAgorot   Int
  status         PaymentStatus
  rawPayload     Json?                       // never contains card data
  createdAt      DateTime @default(now())

  @@unique([provider, providerRef])
}
```

`providerEventId @unique` is what makes webhook processing idempotent — providers retry, and a duplicate delivery must not double-pay or double-issue an invoice.

---

## 8. Coupons (§37)

```prisma
model Coupon {
  id                 String @id @default(cuid())
  code               String @unique          // stored uppercase; compared case-insensitively
  descriptionHe      String?
  discountType       DiscountType            // PERCENTAGE | FIXED_AMOUNT | FREE_SHIPPING
  discountValue      Int                     // basis points if %, agorot if fixed
  minOrderAgorot     Int?
  maxDiscountAgorot  Int?                    // caps a percentage discount
  startsAt           DateTime?
  endsAt             DateTime?
  usageLimitTotal    Int?
  usageLimitPerCustomer Int?
  timesUsed          Int    @default(0)
  appliesTo          CouponScope @default(ENTIRE_ORDER)
  targetCollectionIds String[]               // when scoped to a collection (§37)
  targetProductIds    String[]
  isActive           Boolean @default(true)
  createdAt          DateTime @default(now())

  redemptions        CouponRedemption[]
  carts              Cart[]
  orders             Order[]
}

model CouponRedemption {
  id         String @id @default(cuid())
  couponId   String
  coupon     Coupon @relation(fields: [couponId], references: [id], onDelete: Cascade)
  customerId String?
  customer   Customer? @relation(fields: [customerId], references: [id], onDelete: SetNull)
  orderId    String @unique
  amountAgorot Int                           // discount actually granted
  redeemedAt DateTime @default(now())

  @@index([couponId, customerId])
}
```

`CouponRedemption` exists so **usage limits are enforced against facts, not a counter**. §37 requires usage limits; a bare `timesUsed` column races under concurrency and cannot express per-customer limits. Redemption rows are the authoritative record, written in the same transaction that creates the order, with `orderId` unique to prevent double-counting.

Percentage discounts are stored in **basis points** (`1500` = 15%) to keep the field integral and consistent with the no-floats rule.

Coupon validity, stacking rules, and whether coupons apply to made-to-order items are **TBD** — the schema supports scoping, but the business rules are not invented here.

---

## 9. Custom jewelry requests (§19)

```prisma
model CustomRequest {
  id           String @id @default(cuid())
  requestNumber String @unique
  customerId   String?
  customer     Customer? @relation(fields: [customerId], references: [id], onDelete: SetNull)

  // Contact — captured even without an account
  fullName     String
  email        String
  phone        String

  jewelryType  ProductType                   // §19 Ring / Necklace / Bracelet / Earrings / Other
  description  String @db.Text
  extraDetails String? @db.Text
  budgetAgorot Int?                          // optional / TBD per §19

  status       CustomRequestStatus @default(NEW)
  quoteAgorot  Int?
  quoteNotes   String? @db.Text
  quotedAt     DateTime?
  internalNotes String? @db.Text
  linkedOrderId String?                      // if it converts to a sale

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  images       CustomRequestImage[]
  events       CustomRequestEvent[]

  @@index([status, createdAt])
}

enum CustomRequestStatus {                    // §19 admin workflow, verbatim
  NEW
  REVIEWING
  QUOTE_SENT
  CUSTOMER_APPROVED
  PRODUCTION
  COMPLETED
  REJECTED
}

model CustomRequestImage {
  id          String @id @default(cuid())
  requestId   String
  request     CustomRequest @relation(fields: [requestId], references: [id], onDelete: Cascade)
  storageKey  String                          // PRIVATE namespace — ARCH §8
  contentType String
  sizeBytes   Int
  uploadedAt  DateTime @default(now())
}
```

The workflow enum matches §19 exactly. Uploaded reference images are **private** (ARCHITECTURE §8): they are customer-supplied, may be personal, and are served to admins only through signed expiring URLs.

`CustomRequestEvent` mirrors `OrderStatusEvent` — an append-only status history, since §40 requires admins to "communicate status" and "track progress".

---

## 10. Reviews (§34)

```prisma
model Review {
  id          String @id @default(cuid())
  productId   String
  product     Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  customerId  String?
  customer    Customer? @relation(fields: [customerId], references: [id], onDelete: SetNull)
  authorName  String                          // §34 customer name, display copy
  rating      Int                             // 1–5, constrained in application + DB check
  titleHe     String?
  bodyHe      String? @db.Text
  imageKey    String?                         // §34 optional image
  status      ReviewStatus @default(PENDING)  // PENDING | APPROVED | REJECTED
  isVerifiedPurchase Boolean @default(false)
  moderatedByUserId String?
  moderatedAt DateTime?
  createdAt   DateTime @default(now())

  @@index([productId, status])
}
```

`status` defaults to `PENDING`, so **nothing appears publicly until an admin approves it** — §34 requires moderation in Admin, and defaulting to visible would make moderation cosmetic. Aggregate rating and count are computed from approved reviews only; caching them onto `Product` is a Phase 8 optimization, not a Phase 2 concern.

---

## 11. Wishlist (§26)

```prisma
model Wishlist {
  id         String @id @default(cuid())
  customerId String
  customer   Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)
  nameHe     String @default("המועדפים שלי")
  isDefault  Boolean @default(true)
  items      WishlistItem[]
  createdAt  DateTime @default(now())
}

model WishlistItem {
  id         String @id @default(cuid())
  wishlistId String
  wishlist   Wishlist @relation(fields: [wishlistId], references: [id], onDelete: Cascade)
  productId  String
  product    Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  variantId  String?                          // remember the variant they liked
  addedAt    DateTime @default(now())

  @@unique([wishlistId, productId, variantId])
}
```

§26 states that wishlists **persist for logged-in users**, and that unauthenticated users get a lightweight prompt rather than an interruption. So the wishlist is deliberately account-bound; for anonymous visitors the UI may hold a local-storage draft that merges on login, but that is client state, not a database entity.

Named lists are modelled (rather than a flat customer→product join) because it costs nothing now and avoids a migration if "gift lists" or "bridal lists" appear later — a plausible extension for this business.

---

## 12. Supporting enums

```prisma
enum ProductType        { RING EARRINGS NECKLACE BRACELET SET OTHER }
enum OptionType         { GOLD_KARAT GOLD_COLOR RING_SIZE LENGTH OTHER }
enum CustomFieldType    { TEXT TEXTAREA SELECT LANGUAGE }
enum MediaType          { IMAGE VIDEO }
enum UserRole           { CUSTOMER STAFF ADMIN }
enum PaymentStatus      { PENDING AUTHORIZED PAID FAILED REFUNDED PARTIALLY_REFUNDED }
enum ItemFulfillment    { IN_STOCK MADE_TO_ORDER }
enum DiscountType       { PERCENTAGE FIXED_AMOUNT FREE_SHIPPING }
enum CouponScope        { ENTIRE_ORDER COLLECTION PRODUCT }
enum ReviewStatus       { PENDING APPROVED REJECTED }
```

Gold karat (14K/18K) and colour (yellow/white/rose) from §12 are **data in `ProductOptionValue`, not enums**. §12 defines today's options, but hard-coding them would require a migration to add, say, 9K or platinum. Values are constrained through admin UI, not the type system.

---

## 13. Open modelling questions

Status as of Phase 2B:

| # | Question | Status |
|---|---|---|
| 1 | **Is size a variant axis or a line-item selection?** | **Still open** (TBD.md B11). `ProductOption.isVariantAxis` supports both, per product, as data. The seed demonstrates size as a *selection*. |
| 2 | **Money as `Int` agorot vs `Decimal`** | **DECIDED — integer agorot.** Implemented throughout; every monetary column is `Int` (D0.1, D1.4). |
| 3 | **Low-stock threshold value** (§13) | **Still open.** `lowStockThreshold Int?`; null means no messaging, which the availability resolver honours and a test asserts. |
| 4 | **Coupon stacking** (§37) | **DECIDED — no stacking, one coupon per order** (D2.3). Enforced by `CouponRedemption.orderId @unique`. Whether coupons apply to made-to-order items remains open. |
| 5 | **Automatic collection rules** (§28) | **Still open** (TBD.md B15). `isAutomatic` and `rules` exist and stay unused. |
| 6 | **Certificate issuer taxonomy** (§21) | **Still open** (TBD.md B16). `DiamondCertificate.issuer` is free text. |
| 7 | **Ring-size scale and ranges** (§15–§17) | **Still open.** Sizes are `ProductOptionValue` rows; the scale is data. |
| 8 | **VAT rate and registration status** (§23) | **Still open** (TBD.md B21). `Order.vatRateBps` + `vatAmountAgorot` snapshot per order; no rate is hard-coded. |
| 9 | **Data retention** for guest records and uploads | **Still open** (TBD.md I11). The order-level contact snapshots make pseudonymisation possible without deleting orders. |
| 10 | **Order number format** (§23) | **DECIDED — sequence-backed integer from 100001** (D2.2, TBD.md B22). The display format remains changeable in one file. |
