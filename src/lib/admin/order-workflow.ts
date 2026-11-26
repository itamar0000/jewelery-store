import type { OrderStatus } from '@/generated/prisma/client';
import { prisma } from '@/lib/db';
import { consumeReservation } from '@/lib/inventory/reservation';

import { changeOrderStatus } from './orders';
import {
  canCancel,
  canMarkPaid,
  canMarkRefunded,
  isStepMove,
  manualPaymentLabel,
  type ManualPaymentMethod,
} from './order-steps';

/**
 * The order actions behind the admin's buttons (order-steps.ts).
 *
 * Each re-reads the order and refuses a move that is no longer available, so
 * two people - or one person with two tabs - cannot push an order through
 * the same step twice or along a path the page no longer offers.
 */

export type WorkflowResult = 'done' | 'stale' | 'missing';

/**
 * "התקבל תשלום": a payment taken outside the site (a payment link, Bit, a
 * transfer, cash). Records a `Payment`, marks the order and its payment PAID
 * with a history line, and turns the stock it holds into a sale - the same
 * end state the gateway's webhook will produce.
 */
export async function markOrderPaid(input: {
  readonly orderId: string;
  readonly method: ManualPaymentMethod;
  readonly note: string | null;
  readonly actorUserId: string;
}): Promise<WorkflowResult> {
  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    select: { status: true, paymentStatus: true, totalAgorot: true },
  });
  if (!order) return 'missing';
  if (!canMarkPaid(order.status, order.paymentStatus)) return 'stale';

  const paid = await prisma.$transaction(async (tx) => {
    // The guard and the write are one statement, so a double click records
    // one payment, not two.
    const claimed = await tx.order.updateMany({
      where: { id: input.orderId, paymentStatus: { not: 'PAID' }, status: order.status },
      data: { status: 'PAID', paymentStatus: 'PAID' },
    });
    if (claimed.count === 0) return false;

    await tx.payment.create({
      data: {
        orderId: input.orderId,
        provider: 'manual',
        providerRef: `manual:${input.orderId}:${Date.now()}`,
        amountAgorot: order.totalAgorot,
        status: 'PAID',
        rawPayload: { method: input.method, recordedBy: input.actorUserId },
      },
    });
    await tx.orderStatusEvent.create({
      data: {
        orderId: input.orderId,
        fromStatus: order.status,
        toStatus: 'PAID',
        actorUserId: input.actorUserId,
        note: [`התשלום התקבל: ${manualPaymentLabel(input.method)}.`, input.note]
          .filter(Boolean)
          .join(' '),
      },
    });
    return true;
  });
  if (!paid) return 'stale';

  const holds = await prisma.inventoryReservation.findMany({
    where: { orderId: input.orderId, status: 'ACTIVE' },
    select: { id: true },
  });
  for (const hold of holds) {
    await consumeReservation(prisma, hold.id, { actorUserId: input.actorUserId });
  }
  return 'done';
}

/**
 * One step along the path, or one step back. Shipping may carry the
 * courier's tracking number.
 */
export async function moveOrderStep(input: {
  readonly orderId: string;
  readonly toStatus: OrderStatus;
  readonly trackingNumber: string | null;
  readonly note: string | null;
  readonly actorUserId: string;
}): Promise<WorkflowResult> {
  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    select: { status: true },
  });
  if (!order) return 'missing';
  if (!isStepMove(order.status, input.toStatus)) return 'stale';

  const tracking = input.toStatus === 'SHIPPED' ? input.trackingNumber : null;
  const note = [tracking ? `מספר מעקב: ${tracking}` : null, input.note].filter(Boolean).join(' · ');

  await changeOrderStatus({
    orderId: input.orderId,
    toStatus: input.toStatus,
    note: note || null,
    actorUserId: input.actorUserId,
  });
  if (tracking) {
    await prisma.order.update({ where: { id: input.orderId }, data: { trackingNumber: tracking } });
  }
  return 'done';
}

/** Cancel an order that has not shipped; any stock it holds goes back. */
export async function cancelOrder(input: {
  readonly orderId: string;
  readonly reason: string | null;
  readonly actorUserId: string | null;
}): Promise<WorkflowResult> {
  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    select: { status: true },
  });
  if (!order) return 'missing';
  if (!canCancel(order.status)) return 'stale';

  await changeOrderStatus({
    orderId: input.orderId,
    toStatus: 'CANCELLED',
    note: input.reason,
    actorUserId: input.actorUserId,
  });
  return 'done';
}

/**
 * A cancelled, paid order whose money went back to the customer. Records the
 * fact; the refund itself is made where the money was taken.
 */
export async function markOrderRefunded(input: {
  readonly orderId: string;
  readonly note: string | null;
  readonly actorUserId: string;
}): Promise<WorkflowResult> {
  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    select: { status: true, paymentStatus: true },
  });
  if (!order) return 'missing';
  if (!canMarkRefunded(order.status, order.paymentStatus)) return 'stale';

  await prisma.$transaction([
    prisma.order.update({
      where: { id: input.orderId },
      data: { status: 'REFUNDED', paymentStatus: 'REFUNDED' },
    }),
    prisma.orderStatusEvent.create({
      data: {
        orderId: input.orderId,
        fromStatus: order.status,
        toStatus: 'REFUNDED',
        actorUserId: input.actorUserId,
        note: ['הכסף הוחזר ללקוח.', input.note].filter(Boolean).join(' '),
      },
    }),
  ]);
  return 'done';
}

/**
 * The manual fix, for the rare case the buttons do not cover. Payment states
 * are left out on purpose: PAID and REFUNDED are reached through the buttons
 * that record a payment or a refund, never by naming the status.
 */
export const MANUAL_FIX_FORBIDDEN: readonly OrderStatus[] = ['PAID', 'REFUNDED'];

export async function fixOrderStatus(input: {
  readonly orderId: string;
  readonly toStatus: OrderStatus;
  readonly note: string | null;
  readonly actorUserId: string;
}): Promise<'changed' | 'unchanged' | 'missing' | 'forbidden'> {
  if (MANUAL_FIX_FORBIDDEN.includes(input.toStatus)) {
    const order = await prisma.order.findUnique({
      where: { id: input.orderId },
      select: { status: true },
    });
    if (!order) return 'missing';
    if (order.status !== input.toStatus) return 'forbidden';
  }
  return changeOrderStatus(input);
}

/** How long an unpaid order waits before the daily clean-up cancels it. */
export const UNPAID_ORDER_MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000;

/**
 * Cancel orders nobody paid for within `maxAgeMs`, releasing what they hold.
 * Each is cancelled on its own with a history line, so one failure does not
 * stop the rest and every cancellation explains itself.
 */
export async function cancelStaleUnpaidOrders(
  now: Date = new Date(),
  maxAgeMs: number = UNPAID_ORDER_MAX_AGE_MS,
): Promise<number> {
  const stale = await prisma.order.findMany({
    where: {
      status: 'PENDING_PAYMENT',
      paymentStatus: { not: 'PAID' },
      placedAt: { lte: new Date(now.getTime() - maxAgeMs) },
    },
    select: { id: true },
    take: 500,
  });

  let cancelled = 0;
  for (const order of stale) {
    try {
      const result = await cancelOrder({
        orderId: order.id,
        reason: 'בוטלה אוטומטית: לא שולמה תוך 3 ימים. אם הלקוח שילם, לחצו "התקבל תשלום".',
        actorUserId: null,
      });
      if (result === 'done') cancelled += 1;
    } catch (error) {
      console.error(
        '[cron] could not cancel a stale order:',
        error instanceof Error ? error.message : error,
      );
    }
  }
  return cancelled;
}
