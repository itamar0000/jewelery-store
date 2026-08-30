import { beforeEach, describe, expect, it } from 'vitest';

import { computeOptionSignature } from '@/lib/catalog/option-signature';
import { buildPersonalizationSnapshot, toStorableSnapshot } from '@/lib/personalization/snapshot';
import { resetDb, testPrisma } from '@/test/db';
import {
  createCustomer,
  createOrder,
  createProductWithOption,
  createVariantForValues,
  createVariantWithStock,
} from '@/test/factories';

/**
 * Database invariants, against the REAL migration.
 *
 * The global setup runs `prisma migrate deploy`, not `db push`, so everything
 * asserted here exercises the hand-written raw SQL — the CHECK constraints, the
 * NULLS NOT DISTINCT wishlist index and the order-number sequence. A schema
 * pushed from `schema.prisma` would silently omit all of them and every test
 * below would pass against a database production will never resemble.
 */

beforeEach(async () => {
  await resetDb();
});

describe('variant option combinations', () => {
  it('accepts distinct combinations', async () => {
    const { productId, valueIds } = await createProductWithOption();
    const [yellow, white] = valueIds;

    await expect(createVariantForValues(productId, [yellow!])).resolves.toBeDefined();
    await expect(createVariantForValues(productId, [white!])).resolves.toBeDefined();

    expect(await testPrisma.productVariant.count({ where: { productId } })).toBe(2);
  });

  it('rejects a duplicate option combination', async () => {
    // DATA_MODEL_REVIEW F3: without the signature column nothing stopped two
    // identical "14K Yellow" variants, splitting stock between them.
    const { productId, valueIds } = await createProductWithOption();
    const [yellow] = valueIds;

    await createVariantForValues(productId, [yellow!]);

    await expect(createVariantForValues(productId, [yellow!])).rejects.toThrow(
      /productId.*optionSignature|Unique constraint/i,
    );
  });

  it('ignores the order values were listed in when detecting a duplicate', async () => {
    const { productId, valueIds } = await createProductWithOption();
    const [a, b] = valueIds;

    await createVariantForValues(productId, [a!, b!]);

    await expect(createVariantForValues(productId, [b!, a!])).rejects.toThrow();
  });

  it('scopes uniqueness to the product', async () => {
    // The same signature on a different product is a different variant.
    const first = await createProductWithOption();
    const second = await createProductWithOption();

    await createVariantForValues(first.productId, [first.valueIds[0]!]);
    await expect(
      createVariantForValues(second.productId, [second.valueIds[0]!]),
    ).resolves.toBeDefined();
  });

  it('allows only one variant on a product with no option axes', async () => {
    const { productId } = await createProductWithOption();

    await testPrisma.productVariant.create({
      data: {
        productId,
        sku: 'NOAXIS-1',
        priceAgorot: 1000,
        optionSignature: computeOptionSignature([]),
      },
    });

    await expect(
      testPrisma.productVariant.create({
        data: {
          productId,
          sku: 'NOAXIS-2',
          priceAgorot: 1000,
          optionSignature: computeOptionSignature([]),
        },
      }),
    ).rejects.toThrow();
  });
});

describe('product options', () => {
  it('permits several custom option types on one product', async () => {
    // DATA_MODEL_REVIEW F5: keying uniqueness on `type` allowed only one OTHER
    // option, yet spec section 10 needs Style AND Pendant type on a necklace.
    const { productId } = await createProductWithOption();

    await testPrisma.productOption.create({
      data: { productId, code: 'style', type: 'OTHER', nameHe: 'סגנון' },
    });

    await expect(
      testPrisma.productOption.create({
        data: { productId, code: 'pendant_type', type: 'OTHER', nameHe: 'סוג תליון' },
      }),
    ).resolves.toBeDefined();
  });

  it('still rejects two options sharing a code', async () => {
    const { productId } = await createProductWithOption();

    await expect(
      testPrisma.productOption.create({
        data: { productId, code: 'gold_color', type: 'GOLD_COLOR', nameHe: 'כפילות' },
      }),
    ).rejects.toThrow();
  });
});

describe('wishlist uniqueness', () => {
  async function wishlistFor(): Promise<{
    wishlistId: string;
    productId: string;
    variantId: string;
  }> {
    const customer = await createCustomer();
    const wishlist = await testPrisma.wishlist.create({
      data: { customerId: customer.id },
      select: { id: true },
    });
    const { productId, variantId } = await createVariantWithStock({ onHand: 1, policy: 'DENY' });
    return { wishlistId: wishlist.id, productId, variantId };
  }

  it('rejects the same product twice with no variant selected', async () => {
    // DATA_MODEL_REVIEW F9. PostgreSQL treats NULLs as distinct by default, so
    // a plain UNIQUE would have allowed this unlimited times. The migration
    // creates the index with NULLS NOT DISTINCT instead.
    const { wishlistId, productId } = await wishlistFor();

    await testPrisma.wishlistItem.create({ data: { wishlistId, productId } });

    await expect(
      testPrisma.wishlistItem.create({ data: { wishlistId, productId } }),
    ).rejects.toThrow();

    expect(await testPrisma.wishlistItem.count({ where: { wishlistId } })).toBe(1);
  });

  it('rejects the same product-and-variant twice', async () => {
    const { wishlistId, productId, variantId } = await wishlistFor();

    await testPrisma.wishlistItem.create({ data: { wishlistId, productId, variantId } });

    await expect(
      testPrisma.wishlistItem.create({ data: { wishlistId, productId, variantId } }),
    ).rejects.toThrow();
  });

  it('allows a product once generally and once per variant', async () => {
    // The intended business semantics: "I like this ring" and "I like this ring
    // in white gold" are different entries.
    const { wishlistId, productId, variantId } = await wishlistFor();

    await testPrisma.wishlistItem.create({ data: { wishlistId, productId } });
    await expect(
      testPrisma.wishlistItem.create({ data: { wishlistId, productId, variantId } }),
    ).resolves.toBeDefined();

    expect(await testPrisma.wishlistItem.count({ where: { wishlistId } })).toBe(2);
  });

  it('scopes uniqueness to one wishlist', async () => {
    const first = await wishlistFor();
    const otherCustomer = await createCustomer('other@example.test');
    const second = await testPrisma.wishlist.create({
      data: { customerId: otherCustomer.id },
      select: { id: true },
    });

    await testPrisma.wishlistItem.create({
      data: { wishlistId: first.wishlistId, productId: first.productId },
    });
    await expect(
      testPrisma.wishlistItem.create({
        data: { wishlistId: second.id, productId: first.productId },
      }),
    ).resolves.toBeDefined();
  });
});

describe('order money constraints', () => {
  it('accepts totals that add up', async () => {
    const customer = await createCustomer();

    await expect(
      createOrder({
        customerId: customer.id,
        subtotalAgorot: 100_000,
        discountAgorot: 10_000,
        shippingAgorot: 3_000,
        totalAgorot: 93_000,
      }),
    ).resolves.toBeDefined();
  });

  it('rejects a total that does not equal subtotal - discount + shipping', async () => {
    // The single most valuable constraint in the schema: the last line of
    // defence against a pricing bug shipping money out of the door.
    const customer = await createCustomer();

    await expect(
      createOrder({
        customerId: customer.id,
        subtotalAgorot: 100_000,
        discountAgorot: 10_000,
        shippingAgorot: 3_000,
        totalAgorot: 100_000,
      }),
    ).rejects.toThrow(/Order_total_consistent/);
  });

  it('rejects a discount larger than the goods', async () => {
    const customer = await createCustomer();

    await expect(
      createOrder({
        customerId: customer.id,
        subtotalAgorot: 10_000,
        discountAgorot: 20_000,
        shippingAgorot: 0,
        totalAgorot: -10_000,
      }),
    ).rejects.toThrow(/Order_discount_not_above_subtotal|Order_amounts_non_negative/);
  });

  it('rejects negative money', async () => {
    const customer = await createCustomer();

    await expect(
      createOrder({ customerId: customer.id, subtotalAgorot: -1, totalAgorot: -1 }),
    ).rejects.toThrow(/Order_amounts_non_negative/);
  });
});

describe('order line arithmetic', () => {
  async function orderWithLine(overrides: {
    unitPriceAgorot: number;
    personalizationAgorot: number;
    quantity: number;
    lineDiscountAgorot: number;
    lineTotalAgorot: number;
  }) {
    const customer = await createCustomer();
    const order = await createOrder({ customerId: customer.id });

    return testPrisma.orderItem.create({
      data: {
        orderId: order.id,
        productNameHe: 'מוצר',
        variantLabelHe: '14K זהב צהוב',
        sku: 'SKU-1',
        productSnapshot: {},
        fulfillment: 'IN_STOCK',
        ...overrides,
      },
    });
  }

  it('accepts a consistent line', async () => {
    // (unit + personalization) * quantity - discount
    await expect(
      orderWithLine({
        unitPriceAgorot: 100_000,
        personalizationAgorot: 9_000,
        quantity: 2,
        lineDiscountAgorot: 8_000,
        lineTotalAgorot: 210_000,
      }),
    ).resolves.toBeDefined();
  });

  it('rejects a line total that does not follow the formula', async () => {
    await expect(
      orderWithLine({
        unitPriceAgorot: 100_000,
        personalizationAgorot: 0,
        quantity: 2,
        lineDiscountAgorot: 0,
        lineTotalAgorot: 150_000,
      }),
    ).rejects.toThrow(/OrderItem_line_total_consistent/);
  });

  it('rejects a zero quantity, which is a deletion rather than a row', async () => {
    await expect(
      orderWithLine({
        unitPriceAgorot: 100_000,
        personalizationAgorot: 0,
        quantity: 0,
        lineDiscountAgorot: 0,
        lineTotalAgorot: 0,
      }),
    ).rejects.toThrow(/OrderItem_quantity_positive/);
  });
});

describe('public order numbers', () => {
  it('starts at the configured first number', async () => {
    const customer = await createCustomer();
    const order = await createOrder({ customerId: customer.id });

    expect(order.orderNumber).toBe(100_001);
  });

  it('is independent of the internal id', async () => {
    const customer = await createCustomer();
    const order = await testPrisma.order.findFirstOrThrow({
      where: { id: (await createOrder({ customerId: customer.id })).id },
    });

    expect(String(order.orderNumber)).not.toBe(order.id);
    expect(order.id).toMatch(/^[a-z0-9]{20,}$/);
  });

  it('is unique under concurrent checkout', async () => {
    // A COUNT(*)+1 or MAX()+1 strategy issues duplicates here; the sequence
    // cannot.
    const customer = await createCustomer();

    const orders = await Promise.all(
      Array.from({ length: 25 }, () => createOrder({ customerId: customer.id })),
    );

    const numbers = orders.map((order) => order.orderNumber);
    expect(new Set(numbers).size).toBe(25);
    expect(numbers.every((value) => value >= 100_001)).toBe(true);
  });

  it('does not reuse a number after a rolled-back order', async () => {
    const customer = await createCustomer();
    await createOrder({ customerId: customer.id });

    // A sequence does not roll back, which is exactly what keeps it collision
    // free. Gaps are acceptable; duplicates are not.
    await testPrisma
      .$transaction(async (tx) => {
        await tx.order.create({
          data: {
            customerId: customer.id,
            email: 'x@example.test',
            phone: '050-0000000',
            customerName: 'x',
            subtotalAgorot: 100,
            totalAgorot: 100,
          },
        });
        throw new Error('rollback');
      })
      .catch(() => undefined);

    const next = await createOrder({ customerId: customer.id });
    expect(next.orderNumber).toBeGreaterThan(100_001);
  });
});

describe('historical integrity', () => {
  it('keeps an order readable after the product is renamed, repriced and archived', async () => {
    const customer = await createCustomer();
    const { productId, variantId } = await createVariantWithStock({
      onHand: 5,
      policy: 'DENY',
      priceAgorot: 100_000,
    });

    const snapshot = buildPersonalizationSnapshot(
      [{ key: 'name', labelHe: 'שם לחריטה', fieldType: 'TEXT', position: 1 }],
      { name: 'מיכל' },
    );

    const order = await createOrder({
      customerId: customer.id,
      subtotalAgorot: 109_000,
      totalAgorot: 109_000,
    });
    await testPrisma.orderItem.create({
      data: {
        orderId: order.id,
        productId,
        variantId,
        productNameHe: 'טבעת אורורה',
        variantLabelHe: '14K זהב צהוב',
        sku: 'AURORA-14K-YELLOW',
        goldKarat: '14K',
        goldColor: 'YELLOW',
        sizeValue: '52',
        customization: toStorableSnapshot(snapshot),
        productSnapshot: { nameHe: 'טבעת אורורה', priceAgorot: 100_000 },
        quantity: 1,
        unitPriceAgorot: 100_000,
        personalizationAgorot: 9_000,
        lineTotalAgorot: 109_000,
        fulfillment: 'IN_STOCK',
      },
    });

    // The catalog moves on.
    await testPrisma.product.update({
      where: { id: productId },
      data: { nameHe: 'טבעת אורורה 2.0', basePriceAgorot: 250_000, archivedAt: new Date() },
    });
    await testPrisma.productVariant.update({
      where: { id: variantId },
      data: { priceAgorot: 250_000, archivedAt: new Date() },
    });

    const line = await testPrisma.orderItem.findFirstOrThrow({ where: { orderId: order.id } });

    expect(line.productNameHe).toBe('טבעת אורורה');
    expect(line.unitPriceAgorot).toBe(100_000);
    expect(line.personalizationAgorot).toBe(9_000);
    expect(line.goldKarat).toBe('14K');
    expect(line.sizeValue).toBe('52');
    expect(line.customization).toEqual(toStorableSnapshot(snapshot));
  });

  it('refuses to delete a product referenced by an order', async () => {
    // Spec principle 12: archive, never destructively delete. Restrict is the
    // database backstop behind the admin UI offering only "Archive".
    const customer = await createCustomer();
    const { productId, variantId } = await createVariantWithStock({ onHand: 1, policy: 'DENY' });
    const order = await createOrder({ customerId: customer.id });

    await testPrisma.orderItem.create({
      data: {
        orderId: order.id,
        productId,
        variantId,
        productNameHe: 'מוצר',
        variantLabelHe: 'וריאנט',
        sku: 'SKU-X',
        productSnapshot: {},
        quantity: 1,
        unitPriceAgorot: 100_000,
        lineTotalAgorot: 100_000,
        fulfillment: 'IN_STOCK',
      },
    });

    await expect(testPrisma.product.delete({ where: { id: productId } })).rejects.toThrow();
    await expect(testPrisma.customer.delete({ where: { id: customer.id } })).rejects.toThrow();
  });
});

describe('coupons', () => {
  async function createCoupon(overrides: Record<string, unknown> = {}) {
    return testPrisma.coupon.create({
      data: {
        code: 'SAVE10',
        codeNormalized: 'SAVE10',
        discountType: 'PERCENTAGE',
        discountValue: 1_000,
        ...overrides,
      },
    });
  }

  it('enforces one coupon per order', async () => {
    // The MVP decision (D2.3), enforced by CouponRedemption.orderId being
    // UNIQUE rather than by application logic alone.
    const customer = await createCustomer();
    const order = await createOrder({ customerId: customer.id });
    const first = await createCoupon();
    const second = await createCoupon({ code: 'SAVE20', codeNormalized: 'SAVE20' });

    await testPrisma.couponRedemption.create({
      data: {
        couponId: first.id,
        orderId: order.id,
        customerId: customer.id,
        customerEmailNormalized: 'demo@example.test',
        amountAgorot: 10_000,
      },
    });

    await expect(
      testPrisma.couponRedemption.create({
        data: {
          couponId: second.id,
          orderId: order.id,
          customerId: customer.id,
          customerEmailNormalized: 'demo@example.test',
          amountAgorot: 5_000,
        },
      }),
    ).rejects.toThrow();
  });

  it('rejects a percentage above 100%', async () => {
    await expect(createCoupon({ discountValue: 10_001 })).rejects.toThrow(
      /Coupon_percentage_within_range/,
    );
  });

  it('allows a fixed amount larger than 10000 agorot', async () => {
    // The 10000 bound applies only to percentages; 100.01 ILS off is fine.
    await expect(
      createCoupon({ discountType: 'FIXED_AMOUNT', discountValue: 50_000 }),
    ).resolves.toBeDefined();
  });

  it('rejects a zero discount', async () => {
    await expect(createCoupon({ discountValue: 0 })).rejects.toThrow(/Coupon_value_positive/);
  });

  it('rejects an inverted validity window', async () => {
    await expect(
      createCoupon({ startsAt: new Date('2026-07-01'), endsAt: new Date('2026-06-01') }),
    ).rejects.toThrow(/Coupon_window_ordered/);
  });

  it('keeps redemption history when a coupon is deleted', async () => {
    // The redemption row records the discount actually granted; that is
    // financial history, so the FK is Restrict rather than Cascade.
    const customer = await createCustomer();
    const order = await createOrder({ customerId: customer.id });
    const coupon = await createCoupon();

    await testPrisma.couponRedemption.create({
      data: {
        couponId: coupon.id,
        orderId: order.id,
        customerEmailNormalized: 'demo@example.test',
        amountAgorot: 10_000,
      },
    });

    await expect(testPrisma.coupon.delete({ where: { id: coupon.id } })).rejects.toThrow();
  });

  it('requires a coupon target to match its declared type', async () => {
    const coupon = await createCoupon();

    await expect(
      testPrisma.couponTarget.create({ data: { couponId: coupon.id, targetType: 'PRODUCT' } }),
    ).rejects.toThrow(/CouponTarget_/);
  });
});

describe('diamond spec scoping', () => {
  it('attaches to a product', async () => {
    const { productId } = await createVariantWithStock({ onHand: 1, policy: 'DENY' });

    await expect(
      testPrisma.diamondSpec.create({ data: { productId, totalCaratWeight: '0.50' } }),
    ).resolves.toBeDefined();
  });

  it('attaches to a variant as an override', async () => {
    const { variantId } = await createVariantWithStock({ onHand: 1, policy: 'DENY' });

    await expect(
      testPrisma.diamondSpec.create({ data: { variantId, totalCaratWeight: '0.75' } }),
    ).resolves.toBeDefined();
  });

  it('refuses to attach to both levels at once', async () => {
    const { productId, variantId } = await createVariantWithStock({ onHand: 1, policy: 'DENY' });

    await expect(testPrisma.diamondSpec.create({ data: { productId, variantId } })).rejects.toThrow(
      /DiamondSpec_attaches_to_one_level/,
    );
  });

  it('refuses to attach to neither', async () => {
    await expect(testPrisma.diamondSpec.create({ data: {} })).rejects.toThrow(
      /DiamondSpec_attaches_to_one_level/,
    );
  });
});

describe('custom requests', () => {
  it('records a full lifecycle as events', async () => {
    const request = await testPrisma.customRequest.create({
      data: {
        fullName: 'לקוח בדיקה',
        email: 'demo@example.test',
        phone: '050-0000000',
        jewelryType: 'RING',
        description: 'רעיון לטבעת בעיצוב אישי.',
      },
    });

    expect(request.status).toBe('NEW');
    expect(request.requestNumber).toBe(500_001);

    const lifecycle = [
      'REVIEWING',
      'QUOTE_SENT',
      'CUSTOMER_APPROVED',
      'PRODUCTION',
      'COMPLETED',
    ] as const;
    let previous: string = request.status;

    for (const next of lifecycle) {
      await testPrisma.$transaction([
        testPrisma.customRequest.update({ where: { id: request.id }, data: { status: next } }),
        testPrisma.customRequestEvent.create({
          data: {
            requestId: request.id,
            fromStatus: previous as typeof next,
            toStatus: next,
          },
        }),
      ]);
      previous = next;
    }

    const events = await testPrisma.customRequestEvent.findMany({
      where: { requestId: request.id },
      orderBy: { createdAt: 'asc' },
    });

    expect(events.map((event) => event.toStatus)).toEqual([...lifecycle]);
    expect(events[0]?.fromStatus).toBe('NEW');
  });

  it('supports cancellation as distinct from rejection', async () => {
    // Spec section 19 lists "Rejected / Cancelled"; we declined versus the
    // customer withdrew are different business facts.
    const base = {
      fullName: 'לקוח',
      email: 'demo@example.test',
      phone: '050-0000000',
      jewelryType: 'RING' as const,
      description: 'רעיון.',
    };

    const rejected = await testPrisma.customRequest.create({
      data: { ...base, status: 'REJECTED' },
    });
    const cancelled = await testPrisma.customRequest.create({
      data: { ...base, status: 'CANCELLED' },
    });

    expect(rejected.status).toBe('REJECTED');
    expect(cancelled.status).toBe('CANCELLED');
  });

  it('links a converted request to its order without a dangling pointer', async () => {
    const customer = await createCustomer();
    const order = await createOrder({ customerId: customer.id });

    const request = await testPrisma.customRequest.create({
      data: {
        fullName: 'לקוח',
        email: 'demo@example.test',
        phone: '050-0000000',
        jewelryType: 'RING',
        description: 'רעיון.',
        linkedOrderId: order.id,
      },
    });

    const withOrder = await testPrisma.customRequest.findUniqueOrThrow({
      where: { id: request.id },
      include: { linkedOrder: { select: { orderNumber: true } } },
    });

    expect(withOrder.linkedOrder?.orderNumber).toBe(100_001);
  });
});

describe('review constraints', () => {
  it('rejects a rating outside 1-5', async () => {
    const { productId } = await createVariantWithStock({ onHand: 1, policy: 'DENY' });

    await expect(
      testPrisma.review.create({ data: { productId, authorName: 'לקוח', rating: 6 } }),
    ).rejects.toThrow(/Review_rating_in_range/);
  });

  it('defaults to PENDING so moderation is not cosmetic', async () => {
    const { productId } = await createVariantWithStock({ onHand: 1, policy: 'DENY' });

    const review = await testPrisma.review.create({
      data: { productId, authorName: 'לקוח', rating: 5 },
    });

    expect(review.status).toBe('PENDING');
  });
});

describe('migration state', () => {
  it('applied the initial migration', async () => {
    const rows = await testPrisma.$queryRaw<Array<{ migration_name: string }>>`
      SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL
    `;
    expect(rows.some((row) => row.migration_name.includes('init_domain_model'))).toBe(true);
  });

  it('created the CHECK constraints Prisma cannot express', async () => {
    const rows = await testPrisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT count(*) FROM pg_constraint
       WHERE contype = 'c' AND connamespace = 'public'::regnamespace
    `;
    expect(Number(rows[0]?.count ?? 0)).toBeGreaterThanOrEqual(30);
  });

  it('created the trigram index for Hebrew search', async () => {
    const rows = await testPrisma.$queryRaw<Array<{ indexname: string }>>`
      SELECT indexname FROM pg_indexes
       WHERE schemaname = 'public' AND indexdef LIKE '%gin_trgm_ops%'
    `;
    expect(rows.length).toBeGreaterThan(0);
  });
});
