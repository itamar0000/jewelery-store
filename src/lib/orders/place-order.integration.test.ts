import { createHash } from 'node:crypto';

import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { toAgorot } from '@/lib/money';
import { readInventory, resetDb, testPrisma } from '@/test/db';
import { createPersonalisedRing, ringLine } from '@/test/ring-fixture';

/**
 * Placing an order, against a real PostgreSQL.
 *
 * The promises under test are the ones the payment page makes: the order is
 * real and complete, it is awaiting payment and nothing else, it records
 * exactly what the shopper reviewed, and it cannot be read by anyone but the
 * browser that placed it.
 */
vi.mock('@/lib/db', () => ({ prisma: testPrisma }));

const { addItem, getCartCount } = await import('@/lib/cart/store');
const { placeOrder } = await import('./place-order');
const { getOrderByAccessToken, getPayableOrder } = await import('./read');

let ring: Awaited<ReturnType<typeof createPersonalisedRing>>;

beforeEach(async () => {
  await resetDb();
  ring = await createPersonalisedRing();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

const CHECKOUT = {
  email: '  Michal@Example.test ',
  phone: '050-1234567',
  customerName: 'מיכל כהן',
  marketingOptIn: false,
  shippingAddress: {
    fullName: 'מיכל כהן',
    phone: '050-1234567',
    street: 'הרצל',
    houseNumber: '12',
    apartment: '',
    city: 'תל אביב',
    postalCode: '61000 01',
    instructions: '',
  },
};

async function cartWith(...lines: ReturnType<typeof ringLine>[]): Promise<string> {
  let token: string | null = null;
  for (const line of lines) {
    const added = await addItem(token, line);
    if (!added.result.ok) throw new Error(`fixture add failed: ${JSON.stringify(added.result)}`);
    token = added.token;
  }
  return token!;
}

describe('refusing', () => {
  it('names the fields to correct, distinguishing missing from malformed', async () => {
    const token = await cartWith(ringLine(ring.yellow.id));
    const result = await placeOrder(
      token,
      {
        ...CHECKOUT,
        email: 'not-an-address',
        phone: '',
        shippingAddress: { ...CHECKOUT.shippingAddress, city: ' ', postalCode: '12' },
      },
      { vatRateBps: null },
    );

    expect(result).toEqual({
      ok: false,
      error: 'invalid',
      problems: expect.arrayContaining([
        { field: 'email', reason: 'invalid' },
        { field: 'phone', reason: 'missing' },
        { field: 'shippingAddress.city', reason: 'missing' },
        { field: 'shippingAddress.postalCode', reason: 'invalid' },
      ]),
    });
    expect(await testPrisma.order.count()).toBe(0);
  });

  it('places nothing from an empty or unknown cart', async () => {
    expect(await placeOrder(null, CHECKOUT, { vatRateBps: null })).toEqual({
      ok: false,
      error: 'empty',
    });
    expect(await placeOrder('x'.repeat(32), CHECKOUT, { vatRateBps: null })).toEqual({
      ok: false,
      error: 'empty',
    });
  });

  it('sends the shopper back when the cart changed under them, and writes nothing', async () => {
    const token = await cartWith(ringLine(ring.yellow.id), ringLine(ring.white.id));
    await testPrisma.productVariant.update({
      where: { id: ring.white.id },
      data: { archivedAt: new Date() },
    });

    expect(await placeOrder(token, CHECKOUT, { vatRateBps: null })).toEqual({
      ok: false,
      error: 'changed',
    });
    expect(await testPrisma.order.count()).toBe(0);
    expect(await getCartCount(token)).toBe(2);
  });
});

describe('placing', () => {
  it('writes the order awaiting payment, holds the stock and empties the cart', async () => {
    const token = await cartWith(
      ringLine(ring.yellow.id, { quantity: 2, notes: 'אריזת מתנה' }),
      ringLine(ring.white.id, { size: '50', name: 'Dana', language: 'en' }),
    );

    const result = await placeOrder(token, CHECKOUT, { vatRateBps: null });
    if (!result.ok) throw new Error(JSON.stringify(result));

    const order = await testPrisma.order.findUniqueOrThrow({
      where: { orderNumber: result.orderNumber },
      include: {
        items: { orderBy: { createdAt: 'asc' } },
        addresses: true,
        statusEvents: true,
        reservations: true,
        customer: true,
      },
    });

    // Awaiting payment, and nothing more.
    expect(order.status).toBe('PENDING_PAYMENT');
    expect(order.paymentStatus).toBe('PENDING');
    expect(order.fulfillmentStatus).toBe('UNFULFILLED');
    expect(order.statusEvents.map((event) => event.toStatus)).toEqual(['PENDING_PAYMENT']);

    // (1,000 + 90) x 2 + (1,200 + 90), free shipping, no VAT stated without a rate.
    expect(order.subtotalAgorot).toBe(347_000);
    expect(order.shippingAgorot).toBe(0);
    expect(order.totalAgorot).toBe(347_000);
    expect(order.vatRateBps).toBeNull();
    expect(order.vatAmountAgorot).toBeNull();
    expect(order.shippingMethodLabel).toBe('משלוח');

    // Contact and delivery, trimmed and normalised.
    expect(order.email).toBe('Michal@Example.test');
    expect(order.customer.emailNormalized).toBe('michal@example.test');
    expect(order.customer.marketingOptIn).toBe(false);
    expect(order.addresses).toEqual([
      expect.objectContaining({
        type: 'SHIPPING',
        city: 'תל אביב',
        apartment: null,
        postalCode: '6100001',
        instructions: null,
      }),
    ]);

    // Holds for every line, tied to the order.
    expect(order.reservations.map((hold) => [hold.variantId, hold.quantity, hold.status])).toEqual(
      expect.arrayContaining([
        [ring.yellow.id, 2, 'ACTIVE'],
        [ring.white.id, 1, 'ACTIVE'],
      ]),
    );
    expect(await readInventory(ring.white.id)).toEqual({ onHand: 1, reserved: 1 });

    expect(await getCartCount(token)).toBe(0);
  });

  it('freezes each line: codes for reporting, labels for reading, the price as reviewed', async () => {
    const token = await cartWith(ringLine(ring.yellow.id, { quantity: 2 }));
    const result = await placeOrder(token, CHECKOUT, { vatRateBps: null });
    if (!result.ok) throw new Error(JSON.stringify(result));

    const item = await testPrisma.orderItem.findFirstOrThrow();

    expect(item).toMatchObject({
      productNameHe: 'טבעת חריטה',
      variantLabelHe: 'זהב צהוב',
      sku: ring.yellow.sku,
      goldColor: 'YELLOW',
      sizeValue: '52',
      quantity: 2,
      unitPriceAgorot: 100_000,
      personalizationAgorot: 9_000,
      lineDiscountAgorot: 0,
      lineTotalAgorot: 218_000,
      fulfillment: 'MADE_TO_ORDER',
      prepDays: 10,
    });
    expect(item.customization).toEqual([
      { key: 'name', labelHe: 'שם לחריטה', fieldType: 'TEXT', value: 'מיכל', position: 1 },
      {
        key: 'language',
        labelHe: 'שפת החריטה',
        fieldType: 'LANGUAGE',
        value: 'he',
        valueLabelHe: 'עברית',
        position: 2,
      },
    ]);
    expect(item.selections).toEqual([
      { optionCode: 'ring_size', optionLabelHe: 'מידת טבעת', value: '52', valueLabelHe: '52' },
    ]);
    expect(item.diamondSnapshot).toMatchObject({
      isLabGrown: true,
      totalCaratWeight: '0.5',
      clarity: 'VS1',
      certificate: { issuer: 'IGI', number: 'LG123456' },
    });
  });

  it('states the VAT inside the total when a rate is configured', async () => {
    const token = await cartWith(ringLine(ring.yellow.id));
    const result = await placeOrder(token, CHECKOUT, { vatRateBps: 1800 });
    if (!result.ok) throw new Error(JSON.stringify(result));

    const order = await testPrisma.order.findUniqueOrThrow({
      where: { orderNumber: result.orderNumber },
    });

    // 1,090 including 18% is 923.73 + 166.27.
    expect(order.vatRateBps).toBe(1800);
    expect(order.vatAmountAgorot).toBe(16_627);
    expect(order.totalAgorot).toBe(109_000);
  });

  it('keeps one customer per address, and only ever records consent, never withdraws it', async () => {
    await placeOrder(
      await cartWith(ringLine(ring.yellow.id)),
      { ...CHECKOUT, marketingOptIn: true },
      { vatRateBps: null },
    );
    await placeOrder(
      await cartWith(ringLine(ring.yellow.id)),
      { ...CHECKOUT, email: 'MICHAL@example.test', marketingOptIn: false },
      { vatRateBps: null },
    );

    const customers = await testPrisma.customer.findMany({ include: { orders: true } });
    expect(customers).toHaveLength(1);
    expect(customers[0]!.orders).toHaveLength(2);
    expect(customers[0]!.marketingOptIn).toBe(true);
  });
});

describe('the last unit', () => {
  it('goes to one order; the other is refused and leaves no trace', async () => {
    const first = await cartWith(ringLine(ring.white.id));
    const second = await cartWith(ringLine(ring.white.id, { name: 'נועה' }));

    const results = await Promise.all([
      placeOrder(first, CHECKOUT, { vatRateBps: null }),
      placeOrder(second, CHECKOUT, { vatRateBps: null }),
    ]);

    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.filter((result) => !result.ok)).toEqual([{ ok: false, error: 'stock' }]);

    expect(await testPrisma.order.count()).toBe(1);
    expect(await testPrisma.orderItem.count()).toBe(1);
    expect(await readInventory(ring.white.id)).toEqual({ onHand: 1, reserved: 1 });
    // The refused shopper's bag is untouched.
    expect((await getCartCount(first)) + (await getCartCount(second))).toBe(1);
  });
});

describe('reading an order back', () => {
  it('opens only with the token, which is stored as a hash', async () => {
    const token = await cartWith(ringLine(ring.yellow.id));
    const result = await placeOrder(token, CHECKOUT, { vatRateBps: null });
    if (!result.ok) throw new Error(JSON.stringify(result));

    const stored = await testPrisma.order.findFirstOrThrow({ select: { accessTokenHash: true } });
    expect(stored.accessTokenHash).toBe(
      createHash('sha256').update(result.accessToken).digest('hex'),
    );
    expect(stored.accessTokenHash).not.toContain(result.accessToken);

    const view = await getOrderByAccessToken(result.accessToken);
    expect(view).toMatchObject({
      orderNumber: String(result.orderNumber),
      status: 'PENDING_PAYMENT',
      email: 'Michal@Example.test',
      shipTo: { fullName: 'מיכל כהן', city: 'תל אביב' },
    });
    expect(toAgorot(view!.total)).toBe(109_000);

    expect(await getOrderByAccessToken(null)).toBeNull();
    expect(await getOrderByAccessToken('y'.repeat(32))).toBeNull();
    expect(await getOrderByAccessToken(String(result.orderNumber))).toBeNull();
  });

  it('shows what was ordered after the catalogue changes (principle 9)', async () => {
    const token = await cartWith(ringLine(ring.yellow.id));
    const result = await placeOrder(token, CHECKOUT, { vatRateBps: null });
    if (!result.ok) throw new Error(JSON.stringify(result));

    await testPrisma.product.update({
      where: { id: ring.productId },
      data: { nameHe: 'שם חדש', archivedAt: new Date() },
    });
    await testPrisma.customizationField.updateMany({
      where: { key: 'name' },
      data: { labelHe: 'תווית חדשה' },
    });

    const view = await getOrderByAccessToken(result.accessToken);

    expect(view!.lines[0]).toMatchObject({
      productName: 'טבעת חריטה',
      variantLabel: 'זהב צהוב',
      details: [
        { label: 'מידת טבעת', value: '52' },
        { label: 'שם לחריטה', value: 'מיכל' },
        { label: 'שפת החריטה', value: 'עברית' },
      ],
    });
  });

  it('offers for payment only an order still awaiting it', async () => {
    const token = await cartWith(ringLine(ring.yellow.id));
    const result = await placeOrder(token, CHECKOUT, { vatRateBps: null });
    if (!result.ok) throw new Error(JSON.stringify(result));

    expect(await getPayableOrder(result.accessToken)).toMatchObject({
      orderNumber: result.orderNumber,
      totalAgorot: 109_000,
    });

    await testPrisma.order.update({
      where: { orderNumber: result.orderNumber },
      data: { status: 'PAID', paymentStatus: 'PAID' },
    });

    expect(await getPayableOrder(result.accessToken)).toBeNull();
  });
});
