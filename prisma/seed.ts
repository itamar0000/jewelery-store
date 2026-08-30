import { PrismaPg } from '@prisma/adapter-pg';

import { computeOptionSignature } from '../src/lib/catalog/option-signature.ts';
import { PrismaClient } from '../src/generated/prisma/client.ts';

/**
 * Development seed.
 *
 * EVERYTHING THIS CREATES IS FICTIONAL DEMO DATA. Product names, prices,
 * diamond specifications and stock levels are invented to exercise the schema.
 * None of it reflects real inventory, real pricing, or a real brand — the brand
 * itself is still TBD (MASTER_SPECIFICATION section 2, section 57).
 *
 * Every seeded product is marked in three ways so it cannot be mistaken for
 * real business data:
 *   - SKUs are prefixed `DEMO-`
 *   - each product's short description opens with a Hebrew demo-data notice
 *   - slugs are prefixed `demo-`
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

async function main(): Promise<void> {
  console.log('Seeding DEMO data. Nothing created here is real business data.\n');

  await resetDemoData();

  // ---------------------------------------------------------------- categories
  const rings = await prisma.category.create({
    data: {
      slug: 'demo-rings',
      nameHe: 'טבעות',
      descriptionHe: DEMO_NOTICE,
      position: 1,
      isActive: true,
      // Which facets this category shows, and which `Product.attributes` keys
      // are allowed on its products (D2.5).
      filterConfig: {
        facets: ['price', 'gold_karat', 'gold_color', 'ring_size', 'diamond_shape', 'style'],
        allowedAttributeKeys: ['style'],
      },
    },
  });

  const engagementRings = await prisma.category.create({
    data: {
      slug: 'demo-engagement-rings',
      nameHe: 'טבעות אירוסין',
      descriptionHe: DEMO_NOTICE,
      parentId: rings.id,
      position: 1,
      isActive: true,
      filterConfig: {
        facets: ['price', 'gold_karat', 'gold_color', 'ring_size'],
        allowedAttributeKeys: ['style'],
      },
    },
  });

  const necklaces = await prisma.category.create({
    data: {
      slug: 'demo-necklaces',
      nameHe: 'שרשראות',
      descriptionHe: DEMO_NOTICE,
      position: 2,
      isActive: true,
      filterConfig: {
        facets: ['price', 'gold_karat', 'gold_color', 'length', 'pendant_type'],
        allowedAttributeKeys: ['style', 'pendantType'],
      },
    },
  });

  const bracelets = await prisma.category.create({
    data: {
      slug: 'demo-bracelets',
      nameHe: 'צמידים',
      descriptionHe: DEMO_NOTICE,
      position: 3,
      isActive: true,
      filterConfig: {
        facets: ['price', 'gold_karat', 'gold_color', 'length'],
        allowedAttributeKeys: ['style'],
      },
    },
  });

  // --------------------------------------------------------------- collection
  // Manual only. Automatic collection rules are TBD (TBD.md B15), so
  // `isAutomatic` stays false and `rules` stays null.
  const newArrivals = await prisma.collection.create({
    data: {
      slug: 'demo-new-arrivals',
      nameHe: 'חדש באתר',
      descriptionHe: DEMO_NOTICE,
      position: 1,
      isActive: true,
      isAutomatic: false,
    },
  });

  // =========================================================================
  // PRODUCT 1 — a ring with SIX real variants (gold karat x gold colour).
  //
  // Demonstrates: two variant axes, a non-axis size selection, product-level
  // diamond data shared across all variants, mixed stock and made-to-order.
  // =========================================================================
  const auroraRing = await prisma.product.create({
    data: {
      slug: 'demo-aurora-ring',
      nameHe: 'טבעת אורורה',
      shortDescriptionHe: `${DEMO_NOTICE} טבעת זהב עם יהלום מעבדה.`,
      descriptionHe: `${DEMO_NOTICE}\n\nטבעת קלאסית בעיצוב נקי, משובצת יהלום מעבדה.`,
      primaryCategoryId: engagementRings.id,
      productType: 'RING',
      basePriceAgorot: 489_000, // 4,890.00 ILS
      hasDiamonds: true,
      defaultPrepDays: 14,
      attributes: { style: 'classic' },
      isActive: true,
      publishedAt: new Date(),
      searchDocument: 'טבעת אורורה טבעות אירוסין זהב יהלום מעבדה קלאסי',
      categories: { create: [{ categoryId: rings.id }] },
      collections: { create: [{ collectionId: newArrivals.id, position: 1 }] },
      // Product-level diamond spec: shared by all six variants rather than
      // duplicated onto each (DATA_MODEL_REVIEW F6).
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
        },
      },
    },
  });

  const karatOption = await prisma.productOption.create({
    data: {
      productId: auroraRing.id,
      code: 'gold_karat',
      type: 'GOLD_KARAT',
      nameHe: 'קראט',
      isVariantAxis: true,
      position: 1,
      values: {
        create: [
          { value: '14K', labelHe: '14 קראט', position: 1 },
          { value: '18K', labelHe: '18 קראט', position: 2 },
        ],
      },
    },
    include: { values: true },
  });

  const colorOption = await prisma.productOption.create({
    data: {
      productId: auroraRing.id,
      code: 'gold_color',
      type: 'GOLD_COLOR',
      nameHe: 'גוון זהב',
      isVariantAxis: true,
      position: 2,
      values: {
        create: [
          { value: 'YELLOW', labelHe: 'זהב צהוב', hexColor: '#E5C06B', position: 1 },
          { value: 'WHITE', labelHe: 'זהב לבן', hexColor: '#E8E8E6', position: 2 },
          { value: 'ROSE', labelHe: 'זהב אדום', hexColor: '#E3B7A8', position: 3 },
        ],
      },
    },
    include: { values: true },
  });

  // Ring size is a SELECTION, not an axis: made-to-order pieces are produced
  // per order rather than stocked per size. The business rule is undecided
  // (TBD.md B11) and this is a per-product data flip, not a migration.
  await prisma.productOption.create({
    data: {
      productId: auroraRing.id,
      code: 'ring_size',
      type: 'RING_SIZE',
      nameHe: 'מידה',
      isVariantAxis: false,
      position: 3,
      values: {
        create: [48, 50, 52, 54, 56, 58].map((size, index) => ({
          value: String(size),
          labelHe: String(size),
          position: index + 1,
        })),
      },
    },
  });

  // Six combinations: 2 karats x 3 colours.
  let ringPosition = 0;
  for (const karat of karatOption.values) {
    for (const color of colorOption.values) {
      ringPosition += 1;
      const is18k = karat.value === '18K';
      // 18K carries a surcharge; yellow gold is the base colour.
      const priceAgorot = is18k ? 589_000 : 489_000;
      // Only 14K yellow is held in stock; everything else is made to order.
      const inStock = karat.value === '14K' && color.value === 'YELLOW';

      const variant = await prisma.productVariant.create({
        data: {
          productId: auroraRing.id,
          sku: `DEMO-AURORA-${karat.value}-${color.value}`,
          priceAgorot,
          prepDays: is18k ? 21 : 14,
          weightGrams: is18k ? '3.400' : '3.100',
          optionSignature: computeOptionSignature([karat.id, color.id]),
          position: ringPosition,
          isActive: true,
          optionValues: { create: [{ valueId: karat.id }, { valueId: color.id }] },
          inventory: {
            create: {
              onHand: inStock ? 3 : 0,
              policy: 'MADE_TO_ORDER',
              lowStockThreshold: inStock ? 2 : null,
            },
          },
        },
      });

      if (inStock) {
        await prisma.inventoryMovement.create({
          data: {
            variantId: variant.id,
            onHandDelta: 3,
            reservedDelta: 0,
            reason: 'INITIAL_STOCK',
            onHandAfter: 3,
            reservedAfter: 0,
            note: 'Demo seed',
          },
        });
      }
    }
  }

  await prisma.product.update({
    where: { id: auroraRing.id },
    data: { minPriceAgorot: 489_000, maxPriceAgorot: 589_000 },
  });

  // =========================================================================
  // PRODUCT 2 — a PERSONALIZED, made-to-order necklace.
  //
  // Demonstrates: per-product customization fields with a personalization
  // surcharge, a length selection, and made-to-order with zero stock.
  // =========================================================================
  const lunaNecklace = await prisma.product.create({
    data: {
      slug: 'demo-luna-name-necklace',
      nameHe: 'שרשרת לונה בהתאמה אישית',
      shortDescriptionHe: `${DEMO_NOTICE} שרשרת שם בעיצוב אישי.`,
      descriptionHe: `${DEMO_NOTICE}\n\nשרשרת זהב עם שם בחריטה, מיוצרת בהזמנה.`,
      primaryCategoryId: necklaces.id,
      productType: 'NECKLACE',
      basePriceAgorot: 129_000,
      hasDiamonds: false,
      defaultPrepDays: 10,
      attributes: { style: 'personalized', pendantType: 'name' },
      isActive: true,
      publishedAt: new Date(),
      searchDocument: 'שרשרת לונה שם בהתאמה אישית זהב חריטה',
      collections: { create: [{ collectionId: newArrivals.id, position: 2 }] },
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
            labelHe: 'שפה',
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

  const necklaceColorOption = await prisma.productOption.create({
    data: {
      productId: lunaNecklace.id,
      code: 'gold_color',
      type: 'GOLD_COLOR',
      nameHe: 'גוון זהב',
      isVariantAxis: true,
      position: 1,
      values: {
        create: [
          { value: 'YELLOW', labelHe: 'זהב צהוב', hexColor: '#E5C06B', position: 1 },
          { value: 'ROSE', labelHe: 'זהב אדום', hexColor: '#E3B7A8', position: 2 },
        ],
      },
    },
    include: { values: true },
  });

  await prisma.productOption.create({
    data: {
      productId: lunaNecklace.id,
      code: 'length',
      type: 'LENGTH',
      nameHe: 'אורך',
      isVariantAxis: false,
      position: 2,
      values: {
        create: [
          { value: '40CM', labelHe: '40 ס״מ', position: 1 },
          { value: '45CM', labelHe: '45 ס״מ', position: 2 },
          { value: '50CM', labelHe: '50 ס״מ', position: 3 },
        ],
      },
    },
  });

  for (const [index, color] of necklaceColorOption.values.entries()) {
    await prisma.productVariant.create({
      data: {
        productId: lunaNecklace.id,
        sku: `DEMO-LUNA-${color.value}`,
        priceAgorot: 129_000,
        prepDays: 10,
        optionSignature: computeOptionSignature([color.id]),
        position: index + 1,
        optionValues: { create: [{ valueId: color.id }] },
        // Pure made-to-order: zero stock, still purchasable (section 14).
        inventory: { create: { onHand: 0, policy: 'MADE_TO_ORDER' } },
      },
    });
  }

  await prisma.product.update({
    where: { id: lunaNecklace.id },
    data: { minPriceAgorot: 129_000, maxPriceAgorot: 129_000 },
  });

  // =========================================================================
  // PRODUCT 3 — a stocked bracelet with DENY policy.
  //
  // Demonstrates: real finite stock that genuinely sells out, plus low-stock
  // messaging with a configured threshold.
  // =========================================================================
  const novaBracelet = await prisma.product.create({
    data: {
      slug: 'demo-nova-bracelet',
      nameHe: 'צמיד נובה',
      shortDescriptionHe: `${DEMO_NOTICE} צמיד זהב עדין, במלאי.`,
      descriptionHe: `${DEMO_NOTICE}\n\nצמיד זהב עדין לשימוש יומיומי.`,
      primaryCategoryId: bracelets.id,
      productType: 'BRACELET',
      basePriceAgorot: 219_000,
      hasDiamonds: false,
      lowStockThreshold: 2,
      attributes: { style: 'everyday' },
      isActive: true,
      publishedAt: new Date(),
      searchDocument: 'צמיד נובה זהב עדין יומיומי',
    },
  });

  const braceletColorOption = await prisma.productOption.create({
    data: {
      productId: novaBracelet.id,
      code: 'gold_color',
      type: 'GOLD_COLOR',
      nameHe: 'גוון זהב',
      isVariantAxis: true,
      position: 1,
      values: {
        create: [
          { value: 'YELLOW', labelHe: 'זהב צהוב', hexColor: '#E5C06B', position: 1 },
          { value: 'WHITE', labelHe: 'זהב לבן', hexColor: '#E8E8E6', position: 2 },
        ],
      },
    },
    include: { values: true },
  });

  for (const [index, color] of braceletColorOption.values.entries()) {
    // Yellow is well stocked; white is down to its low-stock threshold.
    const onHand = color.value === 'YELLOW' ? 5 : 2;

    const variant = await prisma.productVariant.create({
      data: {
        productId: novaBracelet.id,
        sku: `DEMO-NOVA-${color.value}`,
        priceAgorot: 219_000,
        optionSignature: computeOptionSignature([color.id]),
        position: index + 1,
        optionValues: { create: [{ valueId: color.id }] },
        // DENY: when stock runs out it is genuinely unavailable.
        inventory: { create: { onHand, policy: 'DENY', lowStockThreshold: 2 } },
      },
    });

    await prisma.inventoryMovement.create({
      data: {
        variantId: variant.id,
        onHandDelta: onHand,
        reservedDelta: 0,
        reason: 'INITIAL_STOCK',
        onHandAfter: onHand,
        reservedAfter: 0,
        note: 'Demo seed',
      },
    });
  }

  await prisma.product.update({
    where: { id: novaBracelet.id },
    data: { minPriceAgorot: 219_000, maxPriceAgorot: 219_000 },
  });

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
    customizationFields: await prisma.customizationField.count(),
    coupons: await prisma.coupon.count(),
  };

  console.log('Seeded (all demo data):');
  for (const [label, value] of Object.entries(counts)) {
    console.log(`  ${label.padEnd(22)} ${value}`);
  }
  console.log('\nNo customers and no orders were created, deliberately.');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    await prisma.$disconnect();
    console.error('Seed failed:', error);
    process.exit(1);
  });
