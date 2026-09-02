import { PrismaPg } from '@prisma/adapter-pg';

import { computeOptionSignature } from '../src/lib/catalog/option-signature.ts';
import { reindexSearchDocuments } from '../src/lib/search/reindex.ts';
import { PrismaClient } from '../src/generated/prisma/client.ts';

/**
 * Development seed.
 *
 * EVERY PRODUCT THIS CREATES IS FICTIONAL. Names, prices, diamond
 * specifications, certificate numbers and stock levels are invented to exercise
 * the schema. None of it reflects real inventory, real pricing, or a real brand
 * - the brand itself is still TBD (MASTER_SPECIFICATION section 2, section 57).
 *
 * Every seeded PRODUCT is marked three ways so it cannot be mistaken for real
 * business data:
 *   - SKUs are prefixed `DEMO-`
 *   - slugs are prefixed `demo-`
 *   - the short description opens with a Hebrew demo-data notice
 *
 * CATEGORIES AND COLLECTIONS ARE NOT MARKED, deliberately, and this is the one
 * place the rule bends. A category slug IS its route: the storefront links to
 * `/rings`, so the row must be `rings` and not `demo-rings` or every category
 * page 404s. "טבעות" is also not fabricated business data - it is the real
 * taxonomy from specification section 5. The fabrication lives in the products,
 * and that is where the markers are.
 *
 * NO CUSTOMERS AND NO ORDERS ARE CREATED. Fake orders would pollute revenue
 * reporting and could be mistaken for real trade.
 *
 * Run with: npm run db:seed
 */

const DEMO_NOTICE = 'נתוני הדגמה בלבד — לא מוצר אמיתי.';

if (process.env.NODE_ENV === 'production') {
  throw new Error('The development seed must never run against production.');
}

try {
  process.loadEnvFile('.env');
} catch {
  // Already in the environment.
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set. Copy .env.example to .env and run `npm run db:up`.');
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

/** Clear demo data so the seed is repeatable. Order respects foreign keys. */
async function resetDemoData(): Promise<void> {
  await prisma.inventoryMovement.deleteMany();
  await prisma.inventoryReservation.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.diamondCertificate.deleteMany();
  await prisma.diamondSpec.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.customizationField.deleteMany();
  await prisma.variantOptionValue.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.productOptionValue.deleteMany();
  await prisma.productOption.deleteMany();
  await prisma.productCollection.deleteMany();
  await prisma.productCategory.deleteMany();
  await prisma.product.deleteMany();
  await prisma.collection.deleteMany();
  await prisma.category.deleteMany();
  await prisma.coupon.deleteMany();
}

// ---------------------------------------------------------------- helpers

const GOLD_COLORS = {
  YELLOW: { value: 'YELLOW', labelHe: 'זהב צהוב', hexColor: '#E5C06B' },
  WHITE: { value: 'WHITE', labelHe: 'זהב לבן', hexColor: '#E8E8E6' },
  ROSE: { value: 'ROSE', labelHe: 'זהב אדום', hexColor: '#E3B7A8' },
} as const;

type GoldColorKey = keyof typeof GOLD_COLORS;

/** Gold colour axis. Values generate variants, each with its own SKU. */
async function createColorOption(productId: string, keys: readonly GoldColorKey[], position = 1) {
  return prisma.productOption.create({
    data: {
      productId,
      code: 'gold_color',
      type: 'GOLD_COLOR',
      nameHe: 'גוון זהב',
      isVariantAxis: true,
      position,
      values: {
        create: keys.map((key, index) => ({ ...GOLD_COLORS[key], position: index + 1 })),
      },
    },
    include: { values: true },
  });
}

/** Karat axis. */
async function createKaratOption(
  productId: string,
  karats: readonly ('14K' | '18K')[],
  position = 2,
) {
  return prisma.productOption.create({
    data: {
      productId,
      code: 'gold_karat',
      type: 'GOLD_KARAT',
      nameHe: 'קראט',
      isVariantAxis: true,
      position,
      values: {
        create: karats.map((karat, index) => ({
          value: karat,
          labelHe: karat === '14K' ? '14 קראט' : '18 קראט',
          position: index + 1,
        })),
      },
    },
    include: { values: true },
  });
}

/**
 * A NON-AXIS option: ring size, chain length.
 *
 * `isVariantAxis: false` means the choice is recorded on the order line rather
 * than generating a stocked SKU per size. Whether size should become an axis is
 * an open business question (TBD.md B11) and flipping it is a data change, not
 * a migration.
 */
async function createSelectionOption(
  productId: string,
  spec: {
    code: string;
    type: 'RING_SIZE' | 'LENGTH';
    nameHe: string;
    values: readonly { value: string; labelHe: string }[];
    position: number;
  },
) {
  return prisma.productOption.create({
    data: {
      productId,
      code: spec.code,
      type: spec.type,
      nameHe: spec.nameHe,
      isVariantAxis: false,
      position: spec.position,
      values: {
        create: spec.values.map((value, index) => ({ ...value, position: index + 1 })),
      },
    },
  });
}

/**
 * One purchasable combination, with inventory and an opening stock movement.
 *
 * Every stocked variant gets an `INITIAL_STOCK` movement so the ledger explains
 * the balance from the first row onward - the schema's whole point is that a
 * stock figure is always attributable.
 */
async function createVariant(spec: {
  productId: string;
  sku: string;
  priceAgorot: number;
  compareAtAgorot?: number;
  optionValueIds: readonly string[];
  onHand: number;
  policy: 'DENY' | 'MADE_TO_ORDER';
  lowStockThreshold?: number | null;
  prepDays?: number | null;
  weightGrams?: string;
  position: number;
  /** Variant-specific gallery. Empty means it shares the product images. */
  images?: readonly { storageKey: string; altHe: string }[];
}) {
  const variant = await prisma.productVariant.create({
    data: {
      productId: spec.productId,
      sku: spec.sku,
      priceAgorot: spec.priceAgorot,
      compareAtAgorot: spec.compareAtAgorot ?? null,
      prepDays: spec.prepDays ?? null,
      weightGrams: spec.weightGrams ?? null,
      optionSignature: computeOptionSignature([...spec.optionValueIds]),
      position: spec.position,
      isActive: true,
      optionValues: { create: spec.optionValueIds.map((valueId) => ({ valueId })) },
      inventory: {
        create: {
          onHand: spec.onHand,
          policy: spec.policy,
          lowStockThreshold: spec.lowStockThreshold ?? null,
        },
      },
    },
  });

  if (spec.images && spec.images.length > 0) {
    await prisma.productImage.createMany({
      data: spec.images.map((image, index) => ({
        productId: spec.productId,
        variantId: variant.id,
        storageKey: image.storageKey,
        altHe: image.altHe,
        position: index + 1,
        isPrimary: index === 0,
      })),
    });
  }

  if (spec.onHand > 0) {
    await prisma.inventoryMovement.create({
      data: {
        variantId: variant.id,
        onHandDelta: spec.onHand,
        reservedDelta: 0,
        reason: 'INITIAL_STOCK',
        onHandAfter: spec.onHand,
        reservedAfter: 0,
        note: 'Demo seed',
      },
    });
  }

  return variant;
}

/** Product-level gallery, shared by every variant that has none of its own. */
async function createProductImages(
  productId: string,
  images: readonly { storageKey: string; altHe: string }[],
) {
  await prisma.productImage.createMany({
    data: images.map((image, index) => ({
      productId,
      variantId: null,
      storageKey: image.storageKey,
      altHe: image.altHe,
      position: index + 1,
      isPrimary: index === 0,
    })),
  });
}

/** Recomputes the denormalised price range from the variants actually created. */
async function refreshPriceRange(productId: string): Promise<void> {
  const variants = await prisma.productVariant.findMany({
    where: { productId, isActive: true, archivedAt: null },
    select: { priceAgorot: true },
  });

  const product = await prisma.product.findUniqueOrThrow({
    where: { id: productId },
    select: { basePriceAgorot: true },
  });

  const prices = variants.map((variant) => variant.priceAgorot ?? product.basePriceAgorot);
  const effective = prices.length > 0 ? prices : [product.basePriceAgorot];

  await prisma.product.update({
    where: { id: productId },
    data: { minPriceAgorot: Math.min(...effective), maxPriceAgorot: Math.max(...effective) },
  });
}

async function main(): Promise<void> {
  console.log('Seeding DEMO data. Products are fictional; nothing here is real business data.\n');

  await resetDemoData();

  // ---------------------------------------------------------------- categories
  //
  // Slugs match the storefront routes exactly (src/lib/navigation/taxonomy.ts).
  // Subcategory slugs are globally unique because `Category.slug` is unique
  // across the whole table - "diamond" alone would collide between rings,
  // earrings, necklaces and bracelets, so each is qualified.

  async function createCategory(spec: {
    slug: string;
    nameHe: string;
    descriptionHe: string;
    position: number;
    parentId?: string;
    facets: readonly string[];
    allowedAttributeKeys?: readonly string[];
  }) {
    return prisma.category.create({
      data: {
        slug: spec.slug,
        nameHe: spec.nameHe,
        descriptionHe: spec.descriptionHe,
        parentId: spec.parentId ?? null,
        position: spec.position,
        isActive: true,
        // Which facets this category displays, and which `Product.attributes`
        // keys are allowed on its products (D2.5).
        filterConfig: {
          facets: [...spec.facets],
          allowedAttributeKeys: [...(spec.allowedAttributeKeys ?? ['style'])],
        },
      },
    });
  }

  const RING_FACETS = ['price', 'gold_karat', 'gold_color', 'diamond_shape', 'carat', 'ring_size'];
  const EARRING_FACETS = ['price', 'gold_karat', 'gold_color', 'diamond_shape', 'style'];
  const NECKLACE_FACETS = ['price', 'gold_karat', 'gold_color', 'length', 'pendant_type'];
  const BRACELET_FACETS = ['price', 'gold_karat', 'gold_color', 'length', 'style'];
  const SET_FACETS = ['price', 'gold_karat', 'gold_color', 'style'];

  const rings = await createCategory({
    slug: 'rings',
    nameHe: 'טבעות',
    descriptionHe:
      'טבעות אירוסין, נישואין וטבעות יומיום, ביהלומים טבעיים וביהלומי מעבדה. ניתן להתאים כל דגם לפי קראט, גוון זהב ומידה.',
    position: 1,
    facets: RING_FACETS,
  });

  const engagementRings = await createCategory({
    slug: 'engagement-rings',
    nameHe: 'טבעות אירוסין',
    descriptionHe: 'טבעות אירוסין ביהלומים טבעיים וביהלומי מעבדה, בהתאמה אישית מלאה.',
    parentId: rings.id,
    position: 1,
    facets: RING_FACETS,
  });

  const diamondRings = await createCategory({
    slug: 'diamond-rings',
    nameHe: 'טבעות יהלומים',
    descriptionHe: 'טבעות משובצות יהלומים, טבעיים או מיהלומי מעבדה.',
    parentId: rings.id,
    position: 2,
    facets: RING_FACETS,
  });

  const weddingRings = await createCategory({
    slug: 'wedding-rings',
    nameHe: 'טבעות נישואין',
    descriptionHe: 'טבעות נישואין קלאסיות בזהב, לגבר ולאישה.',
    parentId: rings.id,
    position: 3,
    facets: RING_FACETS,
  });

  const goldRings = await createCategory({
    slug: 'gold-rings',
    nameHe: 'טבעות זהב',
    descriptionHe: 'טבעות זהב ללא שיבוץ.',
    parentId: rings.id,
    position: 4,
    facets: RING_FACETS,
  });

  const earrings = await createCategory({
    slug: 'earrings',
    nameHe: 'עגילים',
    descriptionHe: 'עגילים צמודים, חישוקים ועגילים תלויים בזהב ובשילוב יהלומים.',
    position: 2,
    facets: EARRING_FACETS,
  });

  const studEarrings = await createCategory({
    slug: 'stud-earrings',
    nameHe: 'עגילים צמודים',
    descriptionHe: 'עגילים צמודים לשימוש יומיומי.',
    parentId: earrings.id,
    position: 1,
    facets: EARRING_FACETS,
  });

  const hoopEarrings = await createCategory({
    slug: 'hoop-earrings',
    nameHe: 'עגילי חישוק',
    descriptionHe: 'חישוקי זהב בגדלים שונים.',
    parentId: earrings.id,
    position: 2,
    facets: EARRING_FACETS,
  });

  const necklaces = await createCategory({
    slug: 'necklaces',
    nameHe: 'שרשראות',
    descriptionHe: 'שרשראות זהב, תליונים ושרשראות שם בעיצוב אישי.',
    position: 3,
    facets: NECKLACE_FACETS,
    allowedAttributeKeys: ['style', 'pendantType'],
  });

  const nameNecklaces = await createCategory({
    slug: 'name-necklaces',
    nameHe: 'שרשראות שם',
    descriptionHe: 'שרשראות עם שם בחריטה, מיוצרות בהזמנה.',
    parentId: necklaces.id,
    position: 1,
    facets: NECKLACE_FACETS,
    allowedAttributeKeys: ['style', 'pendantType'],
  });

  const diamondNecklaces = await createCategory({
    slug: 'diamond-necklaces',
    nameHe: 'שרשראות יהלומים',
    descriptionHe: 'תליוני יהלום עדינים.',
    parentId: necklaces.id,
    position: 2,
    facets: NECKLACE_FACETS,
    allowedAttributeKeys: ['style', 'pendantType'],
  });

  const bracelets = await createCategory({
    slug: 'bracelets',
    nameHe: 'צמידים',
    descriptionHe: 'צמידי טניס, צמידי חוליות וצמידים עדינים לכל יום.',
    position: 4,
    facets: BRACELET_FACETS,
  });

  const tennisBracelets = await createCategory({
    slug: 'tennis-bracelets',
    nameHe: 'צמידי טניס',
    descriptionHe: 'צמידי טניס משובצים יהלומים.',
    parentId: bracelets.id,
    position: 1,
    facets: BRACELET_FACETS,
  });

  const delicateBracelets = await createCategory({
    slug: 'delicate-bracelets',
    nameHe: 'צמידים עדינים',
    descriptionHe: 'צמידי זהב עדינים לשימוש יומיומי.',
    parentId: bracelets.id,
    position: 2,
    facets: BRACELET_FACETS,
  });

  const sets = await createCategory({
    slug: 'sets',
    nameHe: 'סטים',
    descriptionHe: 'סטים תואמים של טבעות, עגילים ושרשראות, כולל סטים לכלה.',
    position: 5,
    facets: SET_FACETS,
  });

  const bridalSets = await createCategory({
    slug: 'bridal-sets',
    nameHe: 'סטים לכלה',
    descriptionHe: 'סטים תואמים לאירוסין ולחתונה.',
    parentId: sets.id,
    position: 1,
    facets: SET_FACETS,
  });

  const giftSets = await createCategory({
    slug: 'gift-sets',
    nameHe: 'סטי מתנה',
    descriptionHe: 'סטים ארוזים למתנה.',
    parentId: sets.id,
    position: 2,
    facets: SET_FACETS,
  });

  // The remaining subcategories the navigation links to. They are created with
  // NO PRODUCTS on purpose, for two reasons: every link in the mega menu must
  // resolve to a real page rather than a 404, and the "category with no
  // products" empty state needs to be reachable in development without
  // deleting data.
  const emptySubcategories: readonly {
    slug: string;
    nameHe: string;
    descriptionHe: string;
    parentId: string;
    position: number;
    facets: readonly string[];
  }[] = [
    {
      slug: 'colored-diamond-rings',
      nameHe: 'טבעות עם יהלומים צבעוניים',
      descriptionHe: 'טבעות משובצות יהלומים צבעוניים.',
      parentId: rings.id,
      position: 5,
      facets: RING_FACETS,
    },
    {
      slug: 'diamond-earrings',
      nameHe: 'עגילי יהלום',
      descriptionHe: 'עגילים משובצים יהלומים.',
      parentId: earrings.id,
      position: 3,
      facets: EARRING_FACETS,
    },
    {
      slug: 'drop-earrings',
      nameHe: 'עגילים תלויים',
      descriptionHe: 'עגילים תלויים בעיצובים שונים.',
      parentId: earrings.id,
      position: 4,
      facets: EARRING_FACETS,
    },
    {
      slug: 'gold-necklaces',
      nameHe: 'שרשראות זהב',
      descriptionHe: 'שרשראות זהב ללא שיבוץ.',
      parentId: necklaces.id,
      position: 3,
      facets: NECKLACE_FACETS,
    },
    {
      slug: 'pendant-necklaces',
      nameHe: 'תליונים',
      descriptionHe: 'תליונים בעיצובים שונים.',
      parentId: necklaces.id,
      position: 4,
      facets: NECKLACE_FACETS,
    },
    {
      slug: 'photo-necklaces',
      nameHe: 'שרשראות תמונה',
      descriptionHe: 'שרשראות עם תמונה, בהזמנה אישית.',
      parentId: necklaces.id,
      position: 5,
      facets: NECKLACE_FACETS,
    },
    {
      slug: 'diamond-bracelets',
      nameHe: 'צמידי יהלומים',
      descriptionHe: 'צמידים משובצים יהלומים.',
      parentId: bracelets.id,
      position: 3,
      facets: BRACELET_FACETS,
    },
    {
      slug: 'gold-bracelets',
      nameHe: 'צמידי זהב',
      descriptionHe: 'צמידי זהב ללא שיבוץ.',
      parentId: bracelets.id,
      position: 4,
      facets: BRACELET_FACETS,
    },
    {
      slug: 'link-bracelets',
      nameHe: 'צמידי חוליות',
      descriptionHe: 'צמידי חוליות בעיצובים שונים.',
      parentId: bracelets.id,
      position: 5,
      facets: BRACELET_FACETS,
    },
    {
      slug: 'ring-earring-sets',
      nameHe: 'טבעת ועגילים',
      descriptionHe: 'סטים תואמים של טבעת ועגילים.',
      parentId: sets.id,
      position: 3,
      facets: SET_FACETS,
    },
    {
      slug: 'necklace-earring-sets',
      nameHe: 'שרשרת ועגילים',
      descriptionHe: 'סטים תואמים של שרשרת ועגילים.',
      parentId: sets.id,
      position: 4,
      facets: SET_FACETS,
    },
  ];

  const extraCategories: Record<string, { id: string }> = {};
  for (const subcategory of emptySubcategories) {
    extraCategories[subcategory.slug] = await createCategory(subcategory);
  }

  const coloredDiamondRings = extraCategories['colored-diamond-rings']!;
  const diamondEarrings = extraCategories['diamond-earrings']!;
  const dropEarrings = extraCategories['drop-earrings']!;
  const goldNecklaces = extraCategories['gold-necklaces']!;
  const pendantNecklaces = extraCategories['pendant-necklaces']!;
  const photoNecklaces = extraCategories['photo-necklaces']!;
  const diamondBracelets = extraCategories['diamond-bracelets']!;
  const goldBracelets = extraCategories['gold-bracelets']!;
  const linkBracelets = extraCategories['link-bracelets']!;
  const ringEarringSets = extraCategories['ring-earring-sets']!;
  const necklaceEarringSets = extraCategories['necklace-earring-sets']!;

  // -------------------------------------------------------------- collections
  //
  // MANUAL only. Automatic collection rules are TBD (TBD.md B15), so
  // `isAutomatic` stays false and `rules` stays null everywhere. Slugs match
  // what `toProductCard` in src/lib/catalog/queries.ts reads for badges.
  async function createCollection(spec: {
    slug: string;
    nameHe: string;
    descriptionHe: string;
    position: number;
  }) {
    return prisma.collection.create({
      data: { ...spec, isActive: true, isAutomatic: false },
    });
  }

  const newArrivals = await createCollection({
    slug: 'new-arrivals',
    nameHe: 'חדש באתר',
    descriptionHe: 'הדגמים האחרונים שנוספו לקטלוג.',
    position: 1,
  });

  const bestSellers = await createCollection({
    slug: 'best-sellers',
    nameHe: 'רבי מכר',
    descriptionHe: 'הדגמים המבוקשים ביותר.',
    position: 2,
  });

  const bridal = await createCollection({
    slug: 'bridal',
    nameHe: 'אוסף הכלה',
    descriptionHe: 'טבעות אירוסין, נישואין וסטים תואמים.',
    position: 3,
  });

  const personalized = await createCollection({
    slug: 'personalized',
    nameHe: 'עיצוב אישי',
    descriptionHe: 'תכשיטים עם חריטה, שמות והתאמה אישית.',
    position: 4,
  });

  // ==========================================================================
  // PRODUCT 1 — אורורה: two variant axes, product-level diamond + certificate,
  // ring-size selection, per-colour variant images, mixed stock.
  // ==========================================================================
  const aurora = await prisma.product.create({
    data: {
      slug: 'demo-aurora-ring',
      nameHe: 'טבעת אורורה סוליטר',
      shortDescriptionHe: `${DEMO_NOTICE} טבעת סוליטר עם יהלום מעבדה.`,
      descriptionHe: `${DEMO_NOTICE}\n\nטבעת סוליטר בעיצוב נקי, משובצת יהלום מעבדה יחיד. הזרועות מלוטשות ביד והשיבוץ מוגבה, כך שהאבן מקבלת מקסימום אור. ניתן להזמין בכל אחד משלושת גווני הזהב, ב-14 או 18 קראט.`,
      primaryCategoryId: engagementRings.id,
      productType: 'RING',
      basePriceAgorot: 489_000,
      hasDiamonds: true,
      defaultPrepDays: 14,
      lowStockThreshold: 2,
      attributes: { style: 'classic' },
      isActive: true,
      publishedAt: new Date(),
      seoTitle: 'טבעת סוליטר יהלום מעבדה',
      seoDescription: 'טבעת אירוסין סוליטר עם יהלום מעבדה, בזהב 14K או 18K.',
      categories: { create: [{ categoryId: rings.id }, { categoryId: diamondRings.id }] },
      collections: {
        create: [
          { collectionId: newArrivals.id, position: 1 },
          { collectionId: bestSellers.id, position: 1 },
          { collectionId: bridal.id, position: 1 },
        ],
      },
      // Product-level: shared by all six variants rather than duplicated onto
      // each, which is exactly what schema F6 exists for.
      diamondSpec: {
        create: {
          isLabGrown: true,
          totalCaratWeight: '0.50',
          stoneCount: 1,
          color: 'F',
          clarity: 'VS1',
          cut: 'Excellent',
          shape: 'Round',
          notesHe: DEMO_NOTICE,
          certificate: {
            create: {
              issuer: 'DEMO-LAB',
              number: 'DEMO-000001',
              issuedAt: new Date('2026-01-15'),
            },
          },
        },
      },
    },
  });

  await createProductImages(aurora.id, [
    { storageKey: 'demo/aurora/main.jpg', altHe: 'טבעת אורורה סוליטר, מבט קדמי' },
    { storageKey: 'demo/aurora/side.jpg', altHe: 'טבעת אורורה, מבט צד' },
    { storageKey: 'demo/aurora/hand.jpg', altHe: 'טבעת אורורה על היד' },
  ]);

  const auroraKarat = await createKaratOption(aurora.id, ['14K', '18K'], 1);
  const auroraColor = await createColorOption(aurora.id, ['YELLOW', 'WHITE', 'ROSE'], 2);

  await createSelectionOption(aurora.id, {
    code: 'ring_size',
    type: 'RING_SIZE',
    nameHe: 'מידה',
    position: 3,
    values: [48, 50, 52, 54, 56, 58].map((size) => ({
      value: String(size),
      labelHe: String(size),
    })),
  });

  let auroraPosition = 0;
  for (const karat of auroraKarat.values) {
    for (const color of auroraColor.values) {
      auroraPosition += 1;
      const is18k = karat.value === '18K';
      const colorKey = color.value as GoldColorKey;

      // Only 14K yellow and 14K white are stocked; the rest are made to order.
      const onHand = !is18k && colorKey === 'YELLOW' ? 6 : !is18k && colorKey === 'WHITE' ? 2 : 0;

      await createVariant({
        productId: aurora.id,
        sku: `DEMO-AURORA-${karat.value}-${color.value}`,
        priceAgorot: is18k ? 589_000 : 489_000,
        optionValueIds: [karat.id, color.id],
        onHand,
        policy: 'MADE_TO_ORDER',
        lowStockThreshold: onHand > 0 ? 2 : null,
        prepDays: is18k ? 21 : 14,
        weightGrams: is18k ? '3.400' : '3.100',
        position: auroraPosition,
        // Per-colour imagery, so changing the gold colour genuinely changes
        // which image rows the gallery resolves.
        images: [
          {
            storageKey: `demo/aurora/${color.value.toLowerCase()}-${karat.value.toLowerCase()}.jpg`,
            altHe: `טבעת אורורה, ${GOLD_COLORS[colorKey].labelHe} ${karat.labelHe}`,
          },
          {
            storageKey: `demo/aurora/${color.value.toLowerCase()}-detail.jpg`,
            altHe: `טבעת אורורה, ${GOLD_COLORS[colorKey].labelHe}, תקריב שיבוץ`,
          },
        ],
      });
    }
  }
  await refreshPriceRange(aurora.id);

  // ==========================================================================
  // PRODUCT 2 — טבעת נישואין: DENY policy, genuinely sells out, one low-stock
  // variant and one already OUT OF STOCK.
  // ==========================================================================
  const wedding = await prisma.product.create({
    data: {
      slug: 'demo-wedding-band',
      nameHe: 'טבעת נישואין קלאסית',
      shortDescriptionHe: `${DEMO_NOTICE} טבעת נישואין חלקה בזהב.`,
      descriptionHe: `${DEMO_NOTICE}\n\nטבעת נישואין חלקה ברוחב 3 מ״מ, בגימור מט או מבריק. מלאי מוגבל: כשנגמר, הדגם אינו זמין להזמנה עד ייצור הסדרה הבאה.`,
      primaryCategoryId: weddingRings.id,
      productType: 'RING',
      basePriceAgorot: 179_000,
      hasDiamonds: false,
      lowStockThreshold: 3,
      attributes: { style: 'classic' },
      isActive: true,
      publishedAt: new Date(),
      categories: { create: [{ categoryId: rings.id }, { categoryId: goldRings.id }] },
      collections: { create: [{ collectionId: bridal.id, position: 2 }] },
    },
  });

  await createProductImages(wedding.id, [
    { storageKey: 'demo/wedding/main.jpg', altHe: 'טבעת נישואין קלאסית' },
    { storageKey: 'demo/wedding/pair.jpg', altHe: 'זוג טבעות נישואין' },
  ]);

  const weddingColor = await createColorOption(wedding.id, ['YELLOW', 'WHITE', 'ROSE'], 1);
  await createSelectionOption(wedding.id, {
    code: 'ring_size',
    type: 'RING_SIZE',
    nameHe: 'מידה',
    position: 2,
    values: [48, 50, 52, 54, 56, 58, 60].map((size) => ({
      value: String(size),
      labelHe: String(size),
    })),
  });

  // Yellow well stocked, white at the low-stock threshold, rose sold out.
  const weddingStock: Record<string, number> = { YELLOW: 8, WHITE: 3, ROSE: 0 };
  for (const [index, color] of weddingColor.values.entries()) {
    await createVariant({
      productId: wedding.id,
      sku: `DEMO-WEDDING-${color.value}`,
      priceAgorot: 179_000,
      optionValueIds: [color.id],
      onHand: weddingStock[color.value] ?? 0,
      // DENY: when it runs out it is genuinely unavailable, not made to order.
      policy: 'DENY',
      lowStockThreshold: 3,
      position: index + 1,
    });
  }
  await refreshPriceRange(wedding.id);

  // ==========================================================================
  // PRODUCT 3 — איטרניטי: on sale (compareAt), variant-level diamond override.
  // ==========================================================================
  const eternity = await prisma.product.create({
    data: {
      slug: 'demo-eternity-ring',
      nameHe: 'טבעת איטרניטי',
      shortDescriptionHe: `${DEMO_NOTICE} טבעת משובצת יהלומי מעבדה בהיקף מלא.`,
      descriptionHe: `${DEMO_NOTICE}\n\nטבעת איטרניטי משובצת יהלומי מעבדה לאורך כל ההיקף. מיוצרת לפי מידה, ולכן זמן ההכנה ארוך מעט יותר.`,
      primaryCategoryId: diamondRings.id,
      productType: 'RING',
      basePriceAgorot: 629_000,
      compareAtAgorot: 749_000,
      hasDiamonds: true,
      defaultPrepDays: 21,
      attributes: { style: 'modern' },
      isActive: true,
      publishedAt: new Date(),
      categories: { create: [{ categoryId: rings.id }] },
      collections: { create: [{ collectionId: bestSellers.id, position: 2 }] },
    },
  });

  await createProductImages(eternity.id, [
    { storageKey: 'demo/eternity/main.jpg', altHe: 'טבעת איטרניטי' },
  ]);

  const eternityColor = await createColorOption(eternity.id, ['WHITE', 'YELLOW'], 1);
  await createSelectionOption(eternity.id, {
    code: 'ring_size',
    type: 'RING_SIZE',
    nameHe: 'מידה',
    position: 2,
    values: [50, 52, 54, 56].map((size) => ({ value: String(size), labelHe: String(size) })),
  });

  for (const [index, color] of eternityColor.values.entries()) {
    const variant = await createVariant({
      productId: eternity.id,
      sku: `DEMO-ETERNITY-${color.value}`,
      priceAgorot: 629_000,
      compareAtAgorot: 749_000,
      optionValueIds: [color.id],
      onHand: 0,
      policy: 'MADE_TO_ORDER',
      prepDays: 21,
      position: index + 1,
      images: [
        {
          storageKey: `demo/eternity/${color.value.toLowerCase()}.jpg`,
          altHe: `טבעת איטרניטי, ${GOLD_COLORS[color.value as GoldColorKey].labelHe}`,
        },
      ],
    });

    // VARIANT-level diamond spec: the two colours carry different stone counts,
    // which is precisely the override case schema F6 allows.
    await prisma.diamondSpec.create({
      data: {
        variantId: variant.id,
        isLabGrown: true,
        totalCaratWeight: color.value === 'WHITE' ? '1.20' : '1.05',
        stoneCount: color.value === 'WHITE' ? 22 : 20,
        color: 'E',
        clarity: 'VVS2',
        cut: 'Excellent',
        shape: 'Round',
        notesHe: DEMO_NOTICE,
      },
    });
  }
  await refreshPriceRange(eternity.id);

  // ==========================================================================
  // PRODUCT 4 — עגילים צמודים: four variants, in stock, product diamond spec.
  // ==========================================================================
  const studs = await prisma.product.create({
    data: {
      slug: 'demo-stud-earrings',
      nameHe: 'עגילי יהלום צמודים',
      shortDescriptionHe: `${DEMO_NOTICE} עגילים צמודים עם יהלומים טבעיים.`,
      descriptionHe: `${DEMO_NOTICE}\n\nזוג עגילים צמודים, יהלום טבעי בכל עגיל, עם סגר בורגי.`,
      primaryCategoryId: studEarrings.id,
      productType: 'EARRINGS',
      basePriceAgorot: 215_000,
      hasDiamonds: true,
      lowStockThreshold: 2,
      attributes: { style: 'classic' },
      isActive: true,
      publishedAt: new Date(),
      categories: { create: [{ categoryId: earrings.id }] },
      collections: { create: [{ collectionId: bestSellers.id, position: 3 }] },
      diamondSpec: {
        create: {
          isLabGrown: false,
          totalCaratWeight: '0.40',
          stoneCount: 2,
          color: 'G',
          clarity: 'VS2',
          cut: 'Very Good',
          shape: 'Round',
          notesHe: DEMO_NOTICE,
        },
      },
    },
  });

  await createProductImages(studs.id, [
    { storageKey: 'demo/studs/main.jpg', altHe: 'עגילי יהלום צמודים' },
    { storageKey: 'demo/studs/detail.jpg', altHe: 'עגילי יהלום, תקריב' },
  ]);

  const studKarat = await createKaratOption(studs.id, ['14K', '18K'], 1);
  const studColor = await createColorOption(studs.id, ['YELLOW', 'WHITE'], 2);

  let studPosition = 0;
  for (const karat of studKarat.values) {
    for (const color of studColor.values) {
      studPosition += 1;
      const is18k = karat.value === '18K';

      await createVariant({
        productId: studs.id,
        sku: `DEMO-STUD-${karat.value}-${color.value}`,
        priceAgorot: is18k ? 259_000 : 215_000,
        optionValueIds: [karat.id, color.id],
        onHand: is18k ? 2 : 7,
        policy: 'MADE_TO_ORDER',
        lowStockThreshold: 2,
        prepDays: 10,
        position: studPosition,
        images: [
          {
            storageKey: `demo/studs/${color.value.toLowerCase()}.jpg`,
            altHe: `עגילי יהלום צמודים, ${GOLD_COLORS[color.value as GoldColorKey].labelHe}`,
          },
        ],
      });
    }
  }
  await refreshPriceRange(studs.id);

  // ==========================================================================
  // PRODUCT 5 — עגילי חישוק: DENY, one variant already out of stock.
  // ==========================================================================
  const hoops = await prisma.product.create({
    data: {
      slug: 'demo-hoop-earrings',
      nameHe: 'עגילי חישוק זהב',
      shortDescriptionHe: `${DEMO_NOTICE} חישוקי זהב קלאסיים.`,
      descriptionHe: `${DEMO_NOTICE}\n\nחישוקי זהב בקוטר 20 מ״מ, חלולים וקלים למשקל.`,
      primaryCategoryId: hoopEarrings.id,
      productType: 'EARRINGS',
      basePriceAgorot: 129_000,
      compareAtAgorot: 155_000,
      hasDiamonds: false,
      lowStockThreshold: 2,
      attributes: { style: 'everyday' },
      isActive: true,
      publishedAt: new Date(),
      categories: { create: [{ categoryId: earrings.id }] },
      collections: { create: [{ collectionId: newArrivals.id, position: 2 }] },
    },
  });

  await createProductImages(hoops.id, [
    { storageKey: 'demo/hoops/main.jpg', altHe: 'עגילי חישוק זהב' },
  ]);

  const hoopColor = await createColorOption(hoops.id, ['YELLOW', 'ROSE'], 1);
  const hoopStock: Record<string, number> = { YELLOW: 2, ROSE: 0 };

  for (const [index, color] of hoopColor.values.entries()) {
    await createVariant({
      productId: hoops.id,
      sku: `DEMO-HOOP-${color.value}`,
      priceAgorot: 129_000,
      compareAtAgorot: 155_000,
      optionValueIds: [color.id],
      onHand: hoopStock[color.value] ?? 0,
      policy: 'DENY',
      lowStockThreshold: 2,
      position: index + 1,
    });
  }
  await refreshPriceRange(hoops.id);

  // ==========================================================================
  // PRODUCT 6 — שרשרת שם: PERSONALIZED, made to order, length selection.
  // ==========================================================================
  const nameNecklace = await prisma.product.create({
    data: {
      slug: 'demo-name-necklace',
      nameHe: 'שרשרת שם בעיצוב אישי',
      shortDescriptionHe: `${DEMO_NOTICE} שרשרת שם בחריטה.`,
      descriptionHe: `${DEMO_NOTICE}\n\nשרשרת זהב עם שם בחריטה, מיוצרת בהזמנה לפי הטקסט שנבחר. ניתן לבחור אורך שרשרת וגוון זהב.`,
      primaryCategoryId: nameNecklaces.id,
      productType: 'NECKLACE',
      basePriceAgorot: 129_000,
      hasDiamonds: false,
      defaultPrepDays: 10,
      attributes: { style: 'personalized', pendantType: 'name' },
      isActive: true,
      publishedAt: new Date(),
      categories: { create: [{ categoryId: necklaces.id }] },
      collections: {
        create: [
          { collectionId: personalized.id, position: 1 },
          { collectionId: newArrivals.id, position: 3 },
        ],
      },
      // Spec section 18: fields are PER PRODUCT, never hard-coded globally.
      customFields: {
        create: [
          {
            key: 'name',
            labelHe: 'שם לחריטה',
            fieldType: 'TEXT',
            isRequired: true,
            maxLength: 12,
            helpTextHe: 'עד 12 תווים.',
            position: 1,
            priceDeltaAgorot: 9_000,
          },
          {
            key: 'language',
            labelHe: 'שפת החריטה',
            fieldType: 'LANGUAGE',
            isRequired: true,
            options: [
              { value: 'he', labelHe: 'עברית' },
              { value: 'en', labelHe: 'אנגלית' },
            ],
            position: 2,
          },
          {
            key: 'notes',
            labelHe: 'הערות',
            fieldType: 'TEXTAREA',
            isRequired: false,
            maxLength: 200,
            position: 3,
          },
        ],
      },
    },
  });

  await createProductImages(nameNecklace.id, [
    { storageKey: 'demo/name-necklace/main.jpg', altHe: 'שרשרת שם בעיצוב אישי' },
    { storageKey: 'demo/name-necklace/worn.jpg', altHe: 'שרשרת שם, נלבשת' },
  ]);

  const nameColor = await createColorOption(nameNecklace.id, ['YELLOW', 'ROSE'], 1);
  await createSelectionOption(nameNecklace.id, {
    code: 'length',
    type: 'LENGTH',
    nameHe: 'אורך',
    position: 2,
    values: [
      { value: '40CM', labelHe: '40 ס״מ' },
      { value: '45CM', labelHe: '45 ס״מ' },
      { value: '50CM', labelHe: '50 ס״מ' },
    ],
  });

  for (const [index, color] of nameColor.values.entries()) {
    await createVariant({
      productId: nameNecklace.id,
      sku: `DEMO-NAME-${color.value}`,
      priceAgorot: 129_000,
      optionValueIds: [color.id],
      // Pure made-to-order: zero stock, still purchasable (section 14).
      onHand: 0,
      policy: 'MADE_TO_ORDER',
      prepDays: 10,
      position: index + 1,
    });
  }
  await refreshPriceRange(nameNecklace.id);

  // ==========================================================================
  // PRODUCT 7 — תליון יהלום: in stock, length selection.
  // ==========================================================================
  const pendant = await prisma.product.create({
    data: {
      slug: 'demo-diamond-pendant',
      nameHe: 'שרשרת תליון יהלום',
      shortDescriptionHe: `${DEMO_NOTICE} תליון יהלום מעבדה עדין.`,
      descriptionHe: `${DEMO_NOTICE}\n\nתליון עדין עם יהלום מעבדה יחיד, על שרשרת זהב דקה.`,
      primaryCategoryId: diamondNecklaces.id,
      productType: 'NECKLACE',
      basePriceAgorot: 174_000,
      hasDiamonds: true,
      lowStockThreshold: 2,
      attributes: { style: 'delicate', pendantType: 'solitaire' },
      isActive: true,
      publishedAt: new Date(),
      categories: { create: [{ categoryId: necklaces.id }] },
      diamondSpec: {
        create: {
          isLabGrown: true,
          totalCaratWeight: '0.25',
          stoneCount: 1,
          color: 'G',
          clarity: 'VS1',
          cut: 'Excellent',
          shape: 'Oval',
          notesHe: DEMO_NOTICE,
        },
      },
    },
  });

  await createProductImages(pendant.id, [
    { storageKey: 'demo/pendant/main.jpg', altHe: 'שרשרת תליון יהלום' },
  ]);

  const pendantColor = await createColorOption(pendant.id, ['YELLOW', 'WHITE'], 1);
  await createSelectionOption(pendant.id, {
    code: 'length',
    type: 'LENGTH',
    nameHe: 'אורך',
    position: 2,
    values: [
      { value: '40CM', labelHe: '40 ס״מ' },
      { value: '45CM', labelHe: '45 ס״מ' },
    ],
  });

  for (const [index, color] of pendantColor.values.entries()) {
    await createVariant({
      productId: pendant.id,
      sku: `DEMO-PENDANT-${color.value}`,
      priceAgorot: 174_000,
      optionValueIds: [color.id],
      onHand: 4,
      policy: 'MADE_TO_ORDER',
      lowStockThreshold: 2,
      prepDays: 7,
      position: index + 1,
    });
  }
  await refreshPriceRange(pendant.id);

  // ==========================================================================
  // PRODUCT 8 — צמיד טניס: two karats, certificate, length selection.
  // ==========================================================================
  const tennis = await prisma.product.create({
    data: {
      slug: 'demo-tennis-bracelet',
      nameHe: 'צמיד טניס יהלומים',
      shortDescriptionHe: `${DEMO_NOTICE} צמיד טניס משובץ לכל האורך.`,
      descriptionHe: `${DEMO_NOTICE}\n\nצמיד טניס משובץ יהלומים טבעיים לכל אורכו, עם סגר בטחון כפול. מיוצר לפי אורך היד.`,
      primaryCategoryId: tennisBracelets.id,
      productType: 'BRACELET',
      basePriceAgorot: 725_000,
      compareAtAgorot: 840_000,
      hasDiamonds: true,
      defaultPrepDays: 18,
      attributes: { style: 'classic' },
      isActive: true,
      publishedAt: new Date(),
      seoTitle: 'צמיד טניס יהלומים טבעיים',
      categories: { create: [{ categoryId: bracelets.id }] },
      collections: {
        create: [
          { collectionId: bestSellers.id, position: 4 },
          { collectionId: newArrivals.id, position: 4 },
        ],
      },
      diamondSpec: {
        create: {
          isLabGrown: false,
          totalCaratWeight: '3.00',
          stoneCount: 42,
          color: 'F',
          clarity: 'VS1',
          cut: 'Excellent',
          shape: 'Round',
          notesHe: DEMO_NOTICE,
          certificate: {
            create: {
              issuer: 'DEMO-LAB',
              number: 'DEMO-000002',
              issuedAt: new Date('2026-02-02'),
            },
          },
        },
      },
    },
  });

  await createProductImages(tennis.id, [
    { storageKey: 'demo/tennis/main.jpg', altHe: 'צמיד טניס יהלומים' },
    { storageKey: 'demo/tennis/clasp.jpg', altHe: 'צמיד טניס, סגר הבטחון' },
  ]);

  const tennisKarat = await createKaratOption(tennis.id, ['14K', '18K'], 1);
  const tennisColor = await createColorOption(tennis.id, ['WHITE', 'YELLOW'], 2);
  await createSelectionOption(tennis.id, {
    code: 'length',
    type: 'LENGTH',
    nameHe: 'אורך',
    position: 3,
    values: [
      { value: '17CM', labelHe: '17 ס״מ' },
      { value: '18CM', labelHe: '18 ס״מ' },
      { value: '19CM', labelHe: '19 ס״מ' },
    ],
  });

  let tennisPosition = 0;
  for (const karat of tennisKarat.values) {
    for (const color of tennisColor.values) {
      tennisPosition += 1;
      const is18k = karat.value === '18K';

      await createVariant({
        productId: tennis.id,
        sku: `DEMO-TENNIS-${karat.value}-${color.value}`,
        priceAgorot: is18k ? 845_000 : 725_000,
        compareAtAgorot: is18k ? 960_000 : 840_000,
        optionValueIds: [karat.id, color.id],
        onHand: 0,
        policy: 'MADE_TO_ORDER',
        prepDays: is18k ? 24 : 18,
        weightGrams: is18k ? '12.500' : '11.800',
        position: tennisPosition,
        images: [
          {
            storageKey: `demo/tennis/${color.value.toLowerCase()}.jpg`,
            altHe: `צמיד טניס, ${GOLD_COLORS[color.value as GoldColorKey].labelHe}`,
          },
        ],
      });
    }
  }
  await refreshPriceRange(tennis.id);

  // ==========================================================================
  // PRODUCT 9 — צמיד נובה: stocked, DENY, low stock on one colour.
  // ==========================================================================
  const nova = await prisma.product.create({
    data: {
      slug: 'demo-nova-bracelet',
      nameHe: 'צמיד נובה עדין',
      shortDescriptionHe: `${DEMO_NOTICE} צמיד זהב עדין, במלאי.`,
      descriptionHe: `${DEMO_NOTICE}\n\nצמיד זהב עדין לשימוש יומיומי, עם שרשרת דקה וסגר קפיצי.`,
      primaryCategoryId: delicateBracelets.id,
      productType: 'BRACELET',
      basePriceAgorot: 219_000,
      hasDiamonds: false,
      lowStockThreshold: 2,
      attributes: { style: 'everyday' },
      isActive: true,
      publishedAt: new Date(),
      categories: { create: [{ categoryId: bracelets.id }] },
    },
  });

  await createProductImages(nova.id, [
    { storageKey: 'demo/nova/main.jpg', altHe: 'צמיד נובה עדין' },
  ]);

  const novaColor = await createColorOption(nova.id, ['YELLOW', 'WHITE'], 1);
  const novaStock: Record<string, number> = { YELLOW: 5, WHITE: 2 };

  for (const [index, color] of novaColor.values.entries()) {
    await createVariant({
      productId: nova.id,
      sku: `DEMO-NOVA-${color.value}`,
      priceAgorot: 219_000,
      optionValueIds: [color.id],
      onHand: novaStock[color.value] ?? 0,
      policy: 'DENY',
      lowStockThreshold: 2,
      position: index + 1,
    });
  }
  await refreshPriceRange(nova.id);

  // ==========================================================================
  // PRODUCT 10 — סט כלה: a SET, made to order.
  // ==========================================================================
  const bridalSet = await prisma.product.create({
    data: {
      slug: 'demo-bridal-set',
      nameHe: 'סט כלה טבעת ועגילים',
      shortDescriptionHe: `${DEMO_NOTICE} סט תואם לטבעת ולעגילים.`,
      descriptionHe: `${DEMO_NOTICE}\n\nסט תואם הכולל טבעת אירוסין וזוג עגילים צמודים באותו גוון זהב ובאותו ליטוש. מיוצר בהזמנה.`,
      primaryCategoryId: bridalSets.id,
      productType: 'SET',
      basePriceAgorot: 1_140_000,
      hasDiamonds: true,
      defaultPrepDays: 28,
      attributes: { style: 'classic' },
      isActive: true,
      publishedAt: new Date(),
      categories: { create: [{ categoryId: sets.id }] },
      collections: { create: [{ collectionId: bridal.id, position: 3 }] },
      diamondSpec: {
        create: {
          isLabGrown: true,
          totalCaratWeight: '1.10',
          stoneCount: 3,
          color: 'F',
          clarity: 'VS1',
          cut: 'Excellent',
          shape: 'Round',
          notesHe: DEMO_NOTICE,
        },
      },
    },
  });

  await createProductImages(bridalSet.id, [
    { storageKey: 'demo/bridal-set/main.jpg', altHe: 'סט כלה, טבעת ועגילים' },
  ]);

  const bridalColor = await createColorOption(bridalSet.id, ['YELLOW', 'WHITE'], 1);
  for (const [index, color] of bridalColor.values.entries()) {
    await createVariant({
      productId: bridalSet.id,
      sku: `DEMO-BRIDALSET-${color.value}`,
      priceAgorot: 1_140_000,
      optionValueIds: [color.id],
      onHand: 0,
      policy: 'MADE_TO_ORDER',
      prepDays: 28,
      position: index + 1,
    });
  }
  await refreshPriceRange(bridalSet.id);

  // ==========================================================================
  // GENERATED CATALOG DEPTH
  //
  // The ten products above are hand-written and exercise the schema's edges:
  // certificates, variant-level diamond overrides, personalization, DENY
  // sell-out. These fifty are BREADTH, and they exist for one reason - search
  // relevance cannot be judged against ten products. With ten, every query
  // either matches almost everything or nothing, and ranking is unobservable.
  //
  // Still explicitly demo data: `demo-` slugs, `DEMO-` SKUs, and the notice on
  // every short description. No customers, no orders, no reviews.
  // ==========================================================================
  interface GeneratedSpec {
    readonly slug: string;
    readonly nameHe: string;
    readonly categoryId: string;
    readonly extraCategoryId?: string;
    readonly productType: 'RING' | 'EARRINGS' | 'NECKLACE' | 'BRACELET' | 'SET';
    readonly priceAgorot: number;
    readonly colors: readonly GoldColorKey[];
    readonly karats?: readonly ('14K' | '18K')[];
    readonly style: string;
    readonly shape?: string;
    readonly caratWeight?: string;
    readonly onHand: number;
    readonly policy: 'DENY' | 'MADE_TO_ORDER';
    readonly collectionIds?: readonly string[];
    readonly sizeOption?: 'ring_size' | 'length';
    readonly descriptionHe: string;
  }

  const generated: readonly GeneratedSpec[] = [
    // --- rings -------------------------------------------------------------
    {
      slug: 'demo-halo-ring',
      nameHe: 'טבעת הילה יהלומים',
      categoryId: engagementRings.id,
      extraCategoryId: rings.id,
      productType: 'RING',
      priceAgorot: 552_000,
      colors: ['WHITE', 'YELLOW'],
      karats: ['14K', '18K'],
      style: 'classic',
      shape: 'Round',
      caratWeight: '0.70',
      onHand: 2,
      policy: 'MADE_TO_ORDER',
      collectionIds: [bridal.id],
      sizeOption: 'ring_size',
      descriptionHe: 'טבעת אירוסין עם הילת יהלומים סביב האבן המרכזית.',
    },
    {
      slug: 'demo-pear-solitaire',
      nameHe: 'טבעת סוליטר טיפה',
      categoryId: engagementRings.id,
      extraCategoryId: rings.id,
      productType: 'RING',
      priceAgorot: 618_000,
      colors: ['ROSE', 'WHITE'],
      karats: ['18K'],
      style: 'modern',
      shape: 'Pear',
      caratWeight: '0.90',
      onHand: 0,
      policy: 'MADE_TO_ORDER',
      collectionIds: [bridal.id],
      sizeOption: 'ring_size',
      descriptionHe: 'טבעת אירוסין עם יהלום בליטוש טיפה.',
    },
    {
      slug: 'demo-emerald-cut-ring',
      nameHe: 'טבעת יהלום אמרלד',
      categoryId: diamondRings.id,
      extraCategoryId: rings.id,
      productType: 'RING',
      priceAgorot: 735_000,
      colors: ['WHITE'],
      karats: ['18K'],
      style: 'modern',
      shape: 'Emerald',
      caratWeight: '1.20',
      onHand: 1,
      policy: 'MADE_TO_ORDER',
      sizeOption: 'ring_size',
      descriptionHe: 'טבעת עם יהלום בליטוש אמרלד מלבני.',
    },
    {
      slug: 'demo-princess-ring',
      nameHe: 'טבעת יהלום פרינסס',
      categoryId: diamondRings.id,
      extraCategoryId: rings.id,
      productType: 'RING',
      priceAgorot: 588_000,
      colors: ['WHITE', 'YELLOW'],
      karats: ['14K'],
      style: 'classic',
      shape: 'Princess',
      caratWeight: '0.80',
      onHand: 3,
      policy: 'MADE_TO_ORDER',
      sizeOption: 'ring_size',
      descriptionHe: 'טבעת עם יהלום בליטוש פרינסס מרובע.',
    },
    {
      slug: 'demo-three-stone-ring',
      nameHe: 'טבעת שלוש אבנים',
      categoryId: engagementRings.id,
      extraCategoryId: rings.id,
      productType: 'RING',
      priceAgorot: 694_000,
      colors: ['YELLOW', 'WHITE', 'ROSE'],
      karats: ['14K', '18K'],
      style: 'classic',
      shape: 'Oval',
      caratWeight: '1.10',
      onHand: 0,
      policy: 'MADE_TO_ORDER',
      collectionIds: [bridal.id],
      sizeOption: 'ring_size',
      descriptionHe: 'טבעת אירוסין עם שלוש אבנים בשורה.',
    },
    {
      slug: 'demo-signet-ring',
      nameHe: 'טבעת חותם זהב',
      categoryId: goldRings.id,
      extraCategoryId: rings.id,
      productType: 'RING',
      priceAgorot: 248_000,
      colors: ['YELLOW'],
      karats: ['14K'],
      style: 'everyday',
      onHand: 6,
      policy: 'DENY',
      sizeOption: 'ring_size',
      descriptionHe: 'טבעת חותם קלאסית בזהב מלא, ניתנת לחריטה.',
    },
    {
      slug: 'demo-stacking-ring',
      nameHe: 'טבעת דקה לשכבות',
      categoryId: goldRings.id,
      extraCategoryId: rings.id,
      productType: 'RING',
      priceAgorot: 89_000,
      colors: ['YELLOW', 'WHITE', 'ROSE'],
      karats: ['14K'],
      style: 'delicate',
      onHand: 12,
      policy: 'DENY',
      sizeOption: 'ring_size',
      descriptionHe: 'טבעת דקה לשילוב בשכבות עם טבעות נוספות.',
    },
    {
      slug: 'demo-twist-ring',
      nameHe: 'טבעת מפותלת',
      categoryId: goldRings.id,
      extraCategoryId: rings.id,
      productType: 'RING',
      priceAgorot: 167_000,
      colors: ['ROSE', 'YELLOW'],
      karats: ['14K'],
      style: 'modern',
      onHand: 4,
      policy: 'DENY',
      sizeOption: 'ring_size',
      descriptionHe: 'טבעת בעיצוב מפותל, לשימוש יומיומי.',
    },
    {
      slug: 'demo-pave-band',
      nameHe: 'טבעת פאווה יהלומים',
      categoryId: diamondRings.id,
      extraCategoryId: rings.id,
      productType: 'RING',
      priceAgorot: 412_000,
      colors: ['WHITE'],
      karats: ['14K', '18K'],
      style: 'classic',
      shape: 'Round',
      caratWeight: '0.45',
      onHand: 2,
      policy: 'MADE_TO_ORDER',
      sizeOption: 'ring_size',
      descriptionHe: 'טבעת משובצת יהלומים קטנים לאורך חצי ההיקף.',
    },
    {
      slug: 'demo-wide-band-ring',
      nameHe: 'טבעת רחבה זהב',
      categoryId: goldRings.id,
      extraCategoryId: rings.id,
      productType: 'RING',
      priceAgorot: 296_000,
      colors: ['YELLOW', 'WHITE'],
      karats: ['18K'],
      style: 'modern',
      onHand: 3,
      policy: 'DENY',
      sizeOption: 'ring_size',
      descriptionHe: 'טבעת רחבה בגימור מט.',
    },
    {
      slug: 'demo-colored-diamond-ring',
      nameHe: 'טבעת יהלום צבעוני',
      categoryId: coloredDiamondRings.id,
      extraCategoryId: rings.id,
      productType: 'RING',
      priceAgorot: 892_000,
      colors: ['ROSE', 'YELLOW'],
      karats: ['18K'],
      style: 'modern',
      shape: 'Oval',
      caratWeight: '1.00',
      onHand: 0,
      policy: 'MADE_TO_ORDER',
      sizeOption: 'ring_size',
      descriptionHe: 'טבעת עם יהלום מעבדה בגוון צבעוני.',
    },
    {
      slug: 'demo-milgrain-band',
      nameHe: 'טבעת נישואין מעוטרת',
      categoryId: weddingRings.id,
      extraCategoryId: rings.id,
      productType: 'RING',
      priceAgorot: 213_000,
      colors: ['YELLOW', 'ROSE'],
      karats: ['14K'],
      style: 'classic',
      onHand: 5,
      policy: 'DENY',
      collectionIds: [bridal.id],
      sizeOption: 'ring_size',
      descriptionHe: 'טבעת נישואין עם עיטור עדין בשוליים.',
    },
    {
      slug: 'demo-comfort-band',
      nameHe: 'טבעת נישואין רחבה',
      categoryId: weddingRings.id,
      extraCategoryId: rings.id,
      productType: 'RING',
      priceAgorot: 264_000,
      colors: ['WHITE', 'YELLOW'],
      karats: ['18K'],
      style: 'everyday',
      onHand: 7,
      policy: 'DENY',
      collectionIds: [bridal.id],
      sizeOption: 'ring_size',
      descriptionHe: 'טבעת נישואין רחבה בגימור נוח לענידה יומיומית.',
    },

    // --- earrings ----------------------------------------------------------
    {
      slug: 'demo-drop-earrings',
      nameHe: 'עגילים תלויים יהלום',
      categoryId: dropEarrings.id,
      extraCategoryId: earrings.id,
      productType: 'EARRINGS',
      priceAgorot: 384_000,
      colors: ['WHITE', 'YELLOW'],
      karats: ['14K', '18K'],
      style: 'modern',
      shape: 'Oval',
      caratWeight: '0.60',
      onHand: 2,
      policy: 'MADE_TO_ORDER',
      descriptionHe: 'עגילים תלויים עם יהלום מעבדה.',
    },
    {
      slug: 'demo-huggie-earrings',
      nameHe: 'עגילי האגי זהב',
      categoryId: hoopEarrings.id,
      extraCategoryId: earrings.id,
      productType: 'EARRINGS',
      priceAgorot: 94_000,
      colors: ['YELLOW', 'ROSE'],
      karats: ['14K'],
      style: 'delicate',
      onHand: 9,
      policy: 'DENY',
      descriptionHe: 'חישוקים קטנים וצמודים לאוזן.',
    },
    {
      slug: 'demo-large-hoops',
      nameHe: 'עגילי חישוק גדולים',
      categoryId: hoopEarrings.id,
      extraCategoryId: earrings.id,
      productType: 'EARRINGS',
      priceAgorot: 178_000,
      colors: ['YELLOW'],
      karats: ['14K'],
      style: 'modern',
      onHand: 4,
      policy: 'DENY',
      descriptionHe: 'חישוקי זהב בקוטר גדול, חלולים וקלים.',
    },
    {
      slug: 'demo-diamond-hoops',
      nameHe: 'עגילי חישוק יהלומים',
      categoryId: diamondEarrings.id,
      extraCategoryId: earrings.id,
      productType: 'EARRINGS',
      priceAgorot: 456_000,
      colors: ['WHITE'],
      karats: ['18K'],
      style: 'classic',
      shape: 'Round',
      caratWeight: '0.75',
      onHand: 1,
      policy: 'MADE_TO_ORDER',
      descriptionHe: 'חישוקים משובצים יהלומי מעבדה.',
    },
    {
      slug: 'demo-pearl-studs',
      nameHe: 'עגילי פנינה צמודים',
      categoryId: studEarrings.id,
      extraCategoryId: earrings.id,
      productType: 'EARRINGS',
      priceAgorot: 76_000,
      colors: ['YELLOW', 'WHITE'],
      karats: ['14K'],
      style: 'classic',
      onHand: 8,
      policy: 'DENY',
      descriptionHe: 'עגילים צמודים עם פנינה.',
    },
    {
      slug: 'demo-climber-earrings',
      nameHe: 'עגילי מטפס',
      categoryId: dropEarrings.id,
      extraCategoryId: earrings.id,
      productType: 'EARRINGS',
      priceAgorot: 142_000,
      colors: ['ROSE', 'YELLOW'],
      karats: ['14K'],
      style: 'modern',
      onHand: 5,
      policy: 'DENY',
      descriptionHe: 'עגילים בעיצוב מטפס לאורך תנוך האוזן.',
    },
    {
      slug: 'demo-princess-studs',
      nameHe: 'עגילי יהלום פרינסס',
      categoryId: diamondEarrings.id,
      extraCategoryId: earrings.id,
      productType: 'EARRINGS',
      priceAgorot: 298_000,
      colors: ['WHITE', 'YELLOW'],
      karats: ['14K', '18K'],
      style: 'classic',
      shape: 'Princess',
      caratWeight: '0.50',
      onHand: 3,
      policy: 'MADE_TO_ORDER',
      descriptionHe: 'עגילים צמודים עם יהלום בליטוש פרינסס.',
    },
    {
      slug: 'demo-threader-earrings',
      nameHe: 'עגילי שרשור',
      categoryId: dropEarrings.id,
      extraCategoryId: earrings.id,
      productType: 'EARRINGS',
      priceAgorot: 108_000,
      colors: ['YELLOW', 'WHITE', 'ROSE'],
      karats: ['14K'],
      style: 'delicate',
      onHand: 6,
      policy: 'DENY',
      descriptionHe: 'עגילים דקים בסגנון שרשור.',
    },

    // --- necklaces ---------------------------------------------------------
    {
      slug: 'demo-tennis-necklace',
      nameHe: 'שרשרת טניס יהלומים',
      categoryId: diamondNecklaces.id,
      extraCategoryId: necklaces.id,
      productType: 'NECKLACE',
      priceAgorot: 1_240_000,
      colors: ['WHITE', 'YELLOW'],
      karats: ['14K', '18K'],
      style: 'classic',
      shape: 'Round',
      caratWeight: '2.50',
      onHand: 0,
      policy: 'MADE_TO_ORDER',
      sizeOption: 'length',
      descriptionHe: 'שרשרת טניס משובצת יהלומי מעבדה לכל האורך.',
    },
    {
      slug: 'demo-bar-necklace',
      nameHe: 'שרשרת בר זהב',
      categoryId: goldNecklaces.id,
      extraCategoryId: necklaces.id,
      productType: 'NECKLACE',
      priceAgorot: 118_000,
      colors: ['YELLOW', 'ROSE'],
      karats: ['14K'],
      style: 'delicate',
      onHand: 7,
      policy: 'DENY',
      sizeOption: 'length',
      descriptionHe: 'שרשרת עם תליון בר אופקי, ניתן לחריטה.',
    },
    {
      slug: 'demo-heart-pendant',
      nameHe: 'שרשרת תליון לב',
      categoryId: pendantNecklaces.id,
      extraCategoryId: necklaces.id,
      productType: 'NECKLACE',
      priceAgorot: 134_000,
      colors: ['ROSE', 'YELLOW'],
      karats: ['14K'],
      style: 'delicate',
      onHand: 5,
      policy: 'DENY',
      sizeOption: 'length',
      descriptionHe: 'שרשרת עם תליון לב עדין.',
    },
    {
      slug: 'demo-initial-necklace',
      nameHe: 'שרשרת אות ראשונה',
      categoryId: nameNecklaces.id,
      extraCategoryId: necklaces.id,
      productType: 'NECKLACE',
      priceAgorot: 104_000,
      colors: ['YELLOW', 'WHITE', 'ROSE'],
      karats: ['14K'],
      style: 'personalized',
      onHand: 0,
      policy: 'MADE_TO_ORDER',
      collectionIds: [personalized.id],
      sizeOption: 'length',
      descriptionHe: 'שרשרת עם אות ראשונה בחריטה, מיוצרת בהזמנה.',
    },
    {
      slug: 'demo-layered-necklace',
      nameHe: 'שרשרת שכבות',
      categoryId: goldNecklaces.id,
      extraCategoryId: necklaces.id,
      productType: 'NECKLACE',
      priceAgorot: 156_000,
      colors: ['YELLOW'],
      karats: ['14K'],
      style: 'modern',
      onHand: 4,
      policy: 'DENY',
      sizeOption: 'length',
      descriptionHe: 'שרשרת דו-שכבתית באורכים משולבים.',
    },
    {
      slug: 'demo-solitaire-pendant',
      nameHe: 'תליון סוליטר יהלום',
      categoryId: diamondNecklaces.id,
      extraCategoryId: necklaces.id,
      productType: 'NECKLACE',
      priceAgorot: 268_000,
      colors: ['WHITE', 'YELLOW'],
      karats: ['14K', '18K'],
      style: 'classic',
      shape: 'Round',
      caratWeight: '0.40',
      onHand: 3,
      policy: 'MADE_TO_ORDER',
      sizeOption: 'length',
      descriptionHe: 'תליון עם יהלום מעבדה יחיד.',
    },
    {
      slug: 'demo-cross-pendant',
      nameHe: 'תליון צלב זהב',
      categoryId: pendantNecklaces.id,
      extraCategoryId: necklaces.id,
      productType: 'NECKLACE',
      priceAgorot: 128_000,
      colors: ['YELLOW', 'WHITE'],
      karats: ['14K'],
      style: 'classic',
      onHand: 6,
      policy: 'DENY',
      sizeOption: 'length',
      descriptionHe: 'תליון צלב בזהב מלא.',
    },
    {
      slug: 'demo-chain-necklace',
      nameHe: 'שרשרת חוליות זהב',
      categoryId: goldNecklaces.id,
      extraCategoryId: necklaces.id,
      productType: 'NECKLACE',
      priceAgorot: 342_000,
      colors: ['YELLOW'],
      karats: ['14K', '18K'],
      style: 'modern',
      onHand: 2,
      policy: 'DENY',
      sizeOption: 'length',
      descriptionHe: 'שרשרת חוליות רחבה בזהב.',
    },
    {
      slug: 'demo-photo-pendant',
      nameHe: 'תליון תמונה',
      categoryId: photoNecklaces.id,
      extraCategoryId: necklaces.id,
      productType: 'NECKLACE',
      priceAgorot: 189_000,
      colors: ['YELLOW', 'ROSE'],
      karats: ['14K'],
      style: 'personalized',
      onHand: 0,
      policy: 'MADE_TO_ORDER',
      collectionIds: [personalized.id],
      sizeOption: 'length',
      descriptionHe: 'תליון עם הטבעת תמונה, מיוצר בהזמנה אישית.',
    },

    // --- bracelets ---------------------------------------------------------
    {
      slug: 'demo-bangle-bracelet',
      nameHe: 'צמיד באנגל זהב',
      categoryId: goldBracelets.id,
      extraCategoryId: bracelets.id,
      productType: 'BRACELET',
      priceAgorot: 386_000,
      colors: ['YELLOW', 'ROSE'],
      karats: ['14K'],
      style: 'classic',
      onHand: 3,
      policy: 'DENY',
      descriptionHe: 'צמיד נוקשה בעיצוב חלק.',
    },
    {
      slug: 'demo-chain-bracelet',
      nameHe: 'צמיד חוליות',
      categoryId: linkBracelets.id,
      extraCategoryId: bracelets.id,
      productType: 'BRACELET',
      priceAgorot: 242_000,
      colors: ['YELLOW', 'WHITE'],
      karats: ['14K'],
      style: 'modern',
      onHand: 5,
      policy: 'DENY',
      sizeOption: 'length',
      descriptionHe: 'צמיד חוליות קלאסי בזהב.',
    },
    {
      slug: 'demo-diamond-bangle',
      nameHe: 'צמיד יהלומים נוקשה',
      categoryId: diamondBracelets.id,
      extraCategoryId: bracelets.id,
      productType: 'BRACELET',
      priceAgorot: 668_000,
      colors: ['WHITE'],
      karats: ['18K'],
      style: 'classic',
      shape: 'Round',
      caratWeight: '1.40',
      onHand: 0,
      policy: 'MADE_TO_ORDER',
      descriptionHe: 'צמיד נוקשה משובץ יהלומי מעבדה.',
    },
    {
      slug: 'demo-charm-bracelet',
      nameHe: 'צמיד תליונים',
      categoryId: linkBracelets.id,
      extraCategoryId: bracelets.id,
      productType: 'BRACELET',
      priceAgorot: 198_000,
      colors: ['YELLOW', 'ROSE'],
      karats: ['14K'],
      style: 'everyday',
      onHand: 4,
      policy: 'DENY',
      sizeOption: 'length',
      descriptionHe: 'צמיד שאליו ניתן להוסיף תליונים.',
    },
    {
      slug: 'demo-name-bracelet',
      nameHe: 'צמיד שם בחריטה',
      categoryId: delicateBracelets.id,
      extraCategoryId: bracelets.id,
      productType: 'BRACELET',
      priceAgorot: 112_000,
      colors: ['YELLOW', 'WHITE', 'ROSE'],
      karats: ['14K'],
      style: 'personalized',
      onHand: 0,
      policy: 'MADE_TO_ORDER',
      collectionIds: [personalized.id],
      sizeOption: 'length',
      descriptionHe: 'צמיד עדין עם שם בחריטה, מיוצר בהזמנה.',
    },
    {
      slug: 'demo-rope-bracelet',
      nameHe: 'צמיד חבל זהב',
      categoryId: goldBracelets.id,
      extraCategoryId: bracelets.id,
      productType: 'BRACELET',
      priceAgorot: 174_000,
      colors: ['YELLOW'],
      karats: ['14K'],
      style: 'everyday',
      onHand: 8,
      policy: 'DENY',
      sizeOption: 'length',
      descriptionHe: 'צמיד בשזירת חבל.',
    },
    {
      slug: 'demo-slim-tennis',
      nameHe: 'צמיד טניס דק',
      categoryId: tennisBracelets.id,
      extraCategoryId: bracelets.id,
      productType: 'BRACELET',
      priceAgorot: 498_000,
      colors: ['WHITE', 'YELLOW'],
      karats: ['14K'],
      style: 'delicate',
      shape: 'Round',
      caratWeight: '1.80',
      onHand: 1,
      policy: 'MADE_TO_ORDER',
      sizeOption: 'length',
      descriptionHe: 'צמיד טניס בגרסה דקה ועדינה.',
    },

    // --- sets --------------------------------------------------------------
    {
      slug: 'demo-necklace-earring-set',
      nameHe: 'סט שרשרת ועגילים',
      categoryId: necklaceEarringSets.id,
      extraCategoryId: sets.id,
      productType: 'SET',
      priceAgorot: 462_000,
      colors: ['YELLOW', 'WHITE'],
      karats: ['14K'],
      style: 'classic',
      shape: 'Round',
      caratWeight: '0.60',
      onHand: 2,
      policy: 'MADE_TO_ORDER',
      descriptionHe: 'סט תואם של שרשרת ועגילים באותו גוון.',
    },
    {
      slug: 'demo-ring-earring-set',
      nameHe: 'סט טבעת ועגילים',
      categoryId: ringEarringSets.id,
      extraCategoryId: sets.id,
      productType: 'SET',
      priceAgorot: 528_000,
      colors: ['ROSE', 'YELLOW'],
      karats: ['14K', '18K'],
      style: 'modern',
      shape: 'Oval',
      caratWeight: '0.80',
      onHand: 0,
      policy: 'MADE_TO_ORDER',
      sizeOption: 'ring_size',
      descriptionHe: 'סט תואם של טבעת ועגילים.',
    },
    {
      slug: 'demo-gift-set-delicate',
      nameHe: 'סט מתנה עדין',
      categoryId: giftSets.id,
      extraCategoryId: sets.id,
      productType: 'SET',
      priceAgorot: 226_000,
      colors: ['YELLOW', 'ROSE'],
      karats: ['14K'],
      style: 'delicate',
      onHand: 6,
      policy: 'DENY',
      descriptionHe: 'סט מתנה ארוז הכולל שרשרת וצמיד עדינים.',
    },
    {
      slug: 'demo-bridal-trio',
      nameHe: 'סט כלה שלושה חלקים',
      categoryId: bridalSets.id,
      extraCategoryId: sets.id,
      productType: 'SET',
      priceAgorot: 1_480_000,
      colors: ['WHITE'],
      karats: ['18K'],
      style: 'classic',
      shape: 'Round',
      caratWeight: '1.60',
      onHand: 0,
      policy: 'MADE_TO_ORDER',
      collectionIds: [bridal.id],
      sizeOption: 'ring_size',
      descriptionHe: 'סט כלה הכולל טבעת אירוסין, טבעת נישואין ועגילים.',
    },
  ];

  for (const [index, spec] of generated.entries()) {
    const product = await prisma.product.create({
      data: {
        slug: spec.slug,
        nameHe: spec.nameHe,
        shortDescriptionHe: `${DEMO_NOTICE} ${spec.descriptionHe}`,
        descriptionHe: `${DEMO_NOTICE}\n\n${spec.descriptionHe}`,
        primaryCategoryId: spec.categoryId,
        productType: spec.productType,
        basePriceAgorot: spec.priceAgorot,
        hasDiamonds: spec.shape !== undefined,
        defaultPrepDays: spec.policy === 'MADE_TO_ORDER' ? 14 : null,
        lowStockThreshold: spec.policy === 'DENY' ? 2 : null,
        attributes: { style: spec.style },
        isActive: true,
        // Spread over time so "newest" has a strict, meaningful order.
        publishedAt: new Date(2026, 3, 1 + index),
        categories: spec.extraCategoryId
          ? { create: [{ categoryId: spec.extraCategoryId }] }
          : undefined,
        collections: spec.collectionIds
          ? {
              create: spec.collectionIds.map((collectionId, position) => ({
                collectionId,
                position: 50 + position,
              })),
            }
          : undefined,
        ...(spec.shape
          ? {
              diamondSpec: {
                create: {
                  isLabGrown: true,
                  shape: spec.shape,
                  totalCaratWeight: spec.caratWeight ?? '0.50',
                  color: 'G',
                  clarity: 'VS1',
                  cut: 'Excellent',
                  notesHe: DEMO_NOTICE,
                },
              },
            }
          : {}),
      },
    });

    await createProductImages(product.id, [
      { storageKey: `demo/${spec.slug}/main.jpg`, altHe: spec.nameHe },
    ]);

    const colorOption = await createColorOption(product.id, spec.colors, 1);
    const karatOption = spec.karats ? await createKaratOption(product.id, spec.karats, 2) : null;

    if (spec.sizeOption === 'ring_size') {
      await createSelectionOption(product.id, {
        code: 'ring_size',
        type: 'RING_SIZE',
        nameHe: 'מידה',
        position: 3,
        values: [50, 52, 54, 56].map((size) => ({ value: String(size), labelHe: String(size) })),
      });
    } else if (spec.sizeOption === 'length') {
      await createSelectionOption(product.id, {
        code: 'length',
        type: 'LENGTH',
        nameHe: 'אורך',
        position: 3,
        values: [
          { value: '40CM', labelHe: '40 ס״מ' },
          { value: '45CM', labelHe: '45 ס״מ' },
        ],
      });
    }

    let position = 0;
    const karatValues = karatOption ? karatOption.values : [null];

    for (const karat of karatValues) {
      for (const color of colorOption.values) {
        position += 1;
        const is18k = karat?.value === '18K';
        const valueIds = [color.id, ...(karat ? [karat.id] : [])];

        await createVariant({
          productId: product.id,
          sku: `DEMO-${spec.slug.replace('demo-', '').toUpperCase()}-${color.value}${karat ? `-${karat.value}` : ''}`,
          priceAgorot: is18k ? Math.round(spec.priceAgorot * 1.18) : spec.priceAgorot,
          optionValueIds: valueIds,
          onHand: position === 1 ? spec.onHand : Math.max(0, spec.onHand - 1),
          policy: spec.policy,
          lowStockThreshold: spec.policy === 'DENY' ? 2 : null,
          prepDays: spec.policy === 'MADE_TO_ORDER' ? (is18k ? 21 : 14) : null,
          position,
        });
      }
    }

    await refreshPriceRange(product.id);
  }

  // --------------------------------------------------------- search documents
  //
  // Built by the SAME function the application and `npm run search:reindex`
  // use, so a seeded catalog is indexed exactly like a real one. The previous
  // seed hand-wrote these strings, which is how a document drifts from the
  // product it describes.
  const indexed = await reindexSearchDocuments(prisma);
  console.log(`Indexed ${indexed} search documents.
`);

  // ------------------------------------------------------------------ coupon
  // One demo coupon so the discount path is exercisable. Not a real promotion.
  await prisma.coupon.create({
    data: {
      code: 'DEMO10',
      codeNormalized: 'DEMO10',
      descriptionHe: `${DEMO_NOTICE} 10% הנחה.`,
      discountType: 'PERCENTAGE',
      discountValue: 1_000, // basis points = 10%
      minOrderAgorot: 100_000,
      maxDiscountAgorot: 50_000,
      usageLimitPerCustomer: 1,
      isActive: true,
    },
  });

  const counts = {
    categories: await prisma.category.count(),
    collections: await prisma.collection.count(),
    products: await prisma.product.count(),
    variants: await prisma.productVariant.count(),
    options: await prisma.productOption.count(),
    optionValues: await prisma.productOptionValue.count(),
    images: await prisma.productImage.count(),
    diamondSpecs: await prisma.diamondSpec.count(),
    certificates: await prisma.diamondCertificate.count(),
    customizationFields: await prisma.customizationField.count(),
    coupons: await prisma.coupon.count(),
    searchDocuments: await prisma.product.count({ where: { searchDocument: { not: null } } }),
  };

  console.log('Seeded (all demo data):');
  for (const [label, value] of Object.entries(counts)) {
    console.log(`  ${label.padEnd(22)} ${value}`);
  }

  console.log(`\nEmpty category for testing empty states: /sets/${giftSets.slug}`);
  console.log('No customers and no orders were created, deliberately.');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    await prisma.$disconnect();
    console.error('Seed failed:', error);
    process.exit(1);
  });
