import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { readInventory, resetDb, testPrisma } from '@/test/db';
import { createPersonalisedRing, ringLine } from '@/test/ring-fixture';

/**
 * The admin's order buttons, against a real PostgreSQL (D4D.42): recording a
 * payment taken by hand, the step path, cancel and refund, the manual fix's
 * limits, and the daily clean-up of unpaid orders.
 */
vi.mock('@/lib/db', () => ({ prisma: testPrisma }));

const { addItem } = await import('@/lib/cart/store');
const { placeOrder } = await import('@/lib/orders/place-order');
const { listOrders, countOrdersByStatus } = await import('./orders');
const {
  cancelOrder,
  cancelStaleUnpaidOrders,
  fixOrderStatus,
  markOrderPaid,
  markOrderRefunded,
  moveOrderStep,
} = await import('./order-workflow');

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

async function placeOrderFixture(): Promise<{ id: string; orderNumber: number }> {
  const added = await addItem(null, ringLine(ring.white.id));
  if (!added.result.ok) throw new Error('fixture add failed');
  const placed = await placeOrder(added.token, CHECKOUT, { vatRateBps: null });
  if (!placed.ok) throw new Error(`fixture order failed: ${JSON.stringify(placed)}`);
  return testPrisma.order.findUniqueOrThrow({
    where: { orderNumber: placed.orderNumber },
    select: { id: true, orderNumber: true },
  });
}

async function read(orderId: string) {
  return testPrisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { payments: true, statusEvents: { orderBy: { createdAt: 'desc' } } },
  });
}

async function paidOrder() {
  const order = await placeOrderFixture();
  await markOrderPaid({ orderId: order.id, method: 'bit', note: null, actorUserId: staffId });
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

describe('markOrderPaid', () => {
  it('records a payment, marks the order paid and turns the hold into a sale', async () => {
    const order = await placeOrderFixture();
    expect(await readInventory(ring.white.id)).toEqual({ onHand: 1, reserved: 1 });

    expect(
      await markOrderPaid({
        orderId: order.id,
        method: 'bit',
        note: 'אישור 1234',
        actorUserId: staffId,
      }),
    ).toBe('done');

    const after = await read(order.id);
    expect(after.status).toBe('PAID');
    expect(after.paymentStatus).toBe('PAID');
    expect(after.payments).toHaveLength(1);
    expect(after.payments[0]).toMatchObject({
      provider: 'manual',
      status: 'PAID',
      amountAgorot: after.totalAgorot,
    });
    expect(after.statusEvents[0]).toMatchObject({
      fromStatus: 'PENDING_PAYMENT',
      toStatus: 'PAID',
      actorUserId: staffId,
    });
    expect(after.statusEvents[0]?.note).toContain('ביט');
    expect(after.statusEvents[0]?.note).toContain('אישור 1234');
    expect(await readInventory(ring.white.id)).toEqual({ onHand: 0, reserved: 0 });
  });

  it('refuses a second press, so one payment is never recorded twice', async () => {
    const order = await paidOrder();
    expect(
      await markOrderPaid({ orderId: order.id, method: 'cash', note: null, actorUserId: staffId }),
    ).toBe('stale');
    expect((await read(order.id)).payments).toHaveLength(1);
  });

  it('brings back an order that was cancelled for not being paid', async () => {
    const order = await placeOrderFixture();
    await cancelOrder({ orderId: order.id, reason: null, actorUserId: null });
    expect(
      await markOrderPaid({
        orderId: order.id,
        method: 'transfer',
        note: null,
        actorUserId: staffId,
      }),
    ).toBe('done');
    expect((await read(order.id)).status).toBe('PAID');
  });
});

describe('moveOrderStep', () => {
  it('walks the path, keeps the tracking number, and steps back', async () => {
    const order = await paidOrder();
    for (const toStatus of ['PROCESSING', 'READY'] as const) {
      expect(
        await moveOrderStep({
          orderId: order.id,
          toStatus,
          trackingNumber: null,
          note: null,
          actorUserId: staffId,
        }),
      ).toBe('done');
    }
    expect(
      await moveOrderStep({
        orderId: order.id,
        toStatus: 'SHIPPED',
        trackingNumber: 'RR123456789IL',
        note: null,
        actorUserId: staffId,
      }),
    ).toBe('done');

    let after = await read(order.id);
    expect(after.status).toBe('SHIPPED');
    expect(after.fulfillmentStatus).toBe('SHIPPED');
    expect(after.trackingNumber).toBe('RR123456789IL');
    expect(after.statusEvents[0]?.note).toContain('RR123456789IL');

    expect(
      await moveOrderStep({
        orderId: order.id,
        toStatus: 'READY',
        trackingNumber: null,
        note: null,
        actorUserId: staffId,
      }),
    ).toBe('done');
    after = await read(order.id);
    expect(after.status).toBe('READY');
  });

  it('refuses a jump the buttons do not offer, such as unpaid straight to shipped', async () => {
    const order = await placeOrderFixture();
    expect(
      await moveOrderStep({
        orderId: order.id,
        toStatus: 'SHIPPED',
        trackingNumber: null,
        note: null,
        actorUserId: staffId,
      }),
    ).toBe('stale');
    expect(
      await moveOrderStep({
        orderId: order.id,
        toStatus: 'PAID',
        trackingNumber: null,
        note: null,
        actorUserId: staffId,
      }),
    ).toBe('stale');
    expect((await read(order.id)).status).toBe('PENDING_PAYMENT');
  });
});

describe('cancel and refund', () => {
  it('cancels an unshipped order and records the refund of a paid one', async () => {
    const order = await paidOrder();
    expect(await markOrderRefunded({ orderId: order.id, note: null, actorUserId: staffId })).toBe(
      'stale',
    );

    expect(
      await cancelOrder({
        orderId: order.id,
        reason: 'סיבת הביטול: שינה דעתו',
        actorUserId: staffId,
      }),
    ).toBe('done');
    expect((await read(order.id)).status).toBe('CANCELLED');

    expect(await markOrderRefunded({ orderId: order.id, note: null, actorUserId: staffId })).toBe(
      'done',
    );
    const after = await read(order.id);
    expect(after.status).toBe('REFUNDED');
    expect(after.paymentStatus).toBe('REFUNDED');
  });

  it('will not cancel an order that already shipped', async () => {
    const order = await paidOrder();
    await testPrisma.order.update({ where: { id: order.id }, data: { status: 'SHIPPED' } });
    expect(await cancelOrder({ orderId: order.id, reason: null, actorUserId: staffId })).toBe(
      'stale',
    );
  });
});

describe('fixOrderStatus', () => {
  it('cannot name a payment state, so the status and the payment never disagree', async () => {
    const order = await placeOrderFixture();
    expect(
      await fixOrderStatus({
        orderId: order.id,
        toStatus: 'PAID',
        note: null,
        actorUserId: staffId,
      }),
    ).toBe('forbidden');
    expect(
      await fixOrderStatus({
        orderId: order.id,
        toStatus: 'REFUNDED',
        note: null,
        actorUserId: staffId,
      }),
    ).toBe('forbidden');
    expect(
      await fixOrderStatus({
        orderId: order.id,
        toStatus: 'PROCESSING',
        note: 'תיקון',
        actorUserId: staffId,
      }),
    ).toBe('changed');
  });
});

describe('cancelStaleUnpaidOrders', () => {
  it('cancels only unpaid orders older than the limit, releasing their stock', async () => {
    const old = await placeOrderFixture();
    await testPrisma.order.update({
      where: { id: old.id },
      data: { placedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) },
    });

    expect(await cancelStaleUnpaidOrders()).toBe(1);
    const after = await read(old.id);
    expect(after.status).toBe('CANCELLED');
    expect(after.statusEvents[0]?.actorUserId).toBeNull();
    expect(after.statusEvents[0]?.note).toContain('בוטלה אוטומטית');
    expect(await readInventory(ring.white.id)).toEqual({ onHand: 1, reserved: 0 });

    expect(await cancelStaleUnpaidOrders()).toBe(0);
  });

  it('leaves a fresh unpaid order alone', async () => {
    await placeOrderFixture();
    expect(await cancelStaleUnpaidOrders()).toBe(0);
  });
});

describe('the "לטיפול" list', () => {
  it('holds unpaid orders only while payment is arranged by hand', async () => {
    const unpaid = await placeOrderFixture();

    expect(
      (await listOrders({ status: 'OPEN', includeUnpaid: true })).map((row) => row.id),
    ).toEqual([unpaid.id]);
    expect(await listOrders({ status: 'OPEN', includeUnpaid: false })).toEqual([]);
    expect((await countOrdersByStatus(false)).OPEN).toBe(0);

    await markOrderPaid({ orderId: unpaid.id, method: 'link', note: null, actorUserId: staffId });
    expect(
      (await listOrders({ status: 'OPEN', includeUnpaid: false })).map((row) => row.id),
    ).toEqual([unpaid.id]);
  });
});
