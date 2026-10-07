import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { readInventory, resetDb, testPrisma } from '@/test/db';
import { createPersonalisedRing, ringLine } from '@/test/ring-fixture';

/**
 * Order status changes from the admin, against a real PostgreSQL (D4D.24).
 *
 * Each change is history with its author; cancelling gives back the stock
 * the order held, once; and payment status is never touched.
 */
vi.mock('@/lib/db', () => ({ prisma: testPrisma }));

const { addItem } = await import('@/lib/cart/store');
const { placeOrder } = await import('@/lib/orders/place-order');
const { changeOrderStatus, getOrderForAdmin, listOrders } = await import('./orders');

let ring: Awaited<ReturnType<typeof createPersonalisedRing>>;
let staffId: string;

const CHECKOUT = {
  email: 'dana@example.test',
  phone: '050-7654321',
  customerName: 'דנה לוי',
  marketingOptIn: false,
  shippingAddress: {
    fullName: 'דנה לוי',
    phone: '050-7654321',
    street: 'הרצל',
    houseNumber: '3',
    apartment: '',
    city: 'חיפה',
    postalCode: '',
    instructions: '',
  },
};

async function placeWhiteRingOrder(): Promise<{ id: string; orderNumber: number }> {
  const added = await addItem(null, ringLine(ring.white.id));
  if (!added.result.ok) throw new Error('fixture add failed');
  const placed = await placeOrder(added.token, CHECKOUT, { vatRateBps: null });
  if (!placed.ok) throw new Error(`fixture order failed: ${JSON.stringify(placed)}`);
  const order = await testPrisma.order.findUniqueOrThrow({
    where: { orderNumber: placed.orderNumber },
    select: { id: true, orderNumber: true },
  });
  return order;
}

beforeEach(async () => {
  await resetDb();
  ring = await createPersonalisedRing();
  staffId = (
    await testPrisma.user.create({
      data: { email: 'owner@shop.test', role: 'ADMIN', displayName: 'בעלים' },
    })
  ).id;
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

describe('changeOrderStatus', () => {
  it('records the change with its author and note, and leaves payment alone', async () => {
    const order = await placeWhiteRingOrder();

    expect(
      await changeOrderStatus({
        orderId: order.id,
        toStatus: 'PROCESSING',
        note: 'התחלנו',
        actorUserId: staffId,
      }),
    ).toBe('changed');

    const detail = await getOrderForAdmin(order.orderNumber);
    expect(detail?.status).toBe('PROCESSING');
    expect(detail?.fulfillmentStatus).toBe('IN_PRODUCTION');
    expect(detail?.paymentStatus).toBe('PENDING');
    expect(detail?.statusEvents[0]).toMatchObject({
      fromStatus: 'PENDING_PAYMENT',
      toStatus: 'PROCESSING',
      note: 'התחלנו',
      actor: { displayName: 'בעלים' },
    });
  });

  it('gives back held stock on cancellation, once', async () => {
    const order = await placeWhiteRingOrder();
    expect(await readInventory(ring.white.id)).toEqual({ onHand: 1, reserved: 1 });

    for (let i = 0; i < 2; i += 1) {
      await changeOrderStatus({
        orderId: order.id,
        toStatus: 'CANCELLED',
        note: null,
        actorUserId: staffId,
      });
    }
    expect(await readInventory(ring.white.id)).toEqual({ onHand: 1, reserved: 0 });
  });

  it('finds an order by its number, the customer name or the phone', async () => {
    const order = await placeWhiteRingOrder();
    for (const query of [String(order.orderNumber), 'דנה', '0507654321']) {
      const rows = await listOrders({ query });
      expect(rows.map((row) => row.id)).toEqual([order.id]);
    }
    expect(await listOrders({ query: 'אין כזה' })).toEqual([]);
  });
});
