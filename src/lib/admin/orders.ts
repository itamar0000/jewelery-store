import { prisma } from '@/lib/db';
import type { OrderStatus, Prisma } from '@/generated/prisma/client';
import { releaseReservation } from '@/lib/inventory/reservation';
import { readSelections } from '@/lib/orders/read';
import {
  parsePersonalizationSnapshot,
  renderPersonalizationSnapshot,
} from '@/lib/personalization/snapshot';

/**
 * Orders, as the workshop sees them (D4D.24).
 *
 * EVERYTHING SHOWN COMES FROM THE ORDER'S OWN SNAPSHOTS - names, choices,
 * engraving, prices - never from the catalogue, so an order reads as it was
 * placed even after the product changed (principle 9).
 *
 * STATUS CHANGES ARE HISTORY. Each one writes an `OrderStatusEvent` with who
 * made it and an optional note; the status column is only the latest entry.
 * Payment status is not touched here: it belongs to the payment provider's
 * confirmations, and the admin cannot say an order was paid by card.
 */

export const ORDER_STATUS_LABELS: Readonly<Record<OrderStatus, string>> = {
  PENDING_PAYMENT: 'ממתינה לתשלום',
  PAID: 'שולמה',
  PROCESSING: 'בהכנה',
  READY: 'מוכנה',
  SHIPPED: 'נשלחה',
  DELIVERED: 'נמסרה',
  COMPLETED: 'הושלמה',
  CANCELLED: 'בוטלה',
  REFUNDED: 'זוכתה',
};

export const ORDER_STATUSES = Object.keys(ORDER_STATUS_LABELS) as OrderStatus[];

export const PAYMENT_STATUS_LABELS: Readonly<Record<string, string>> = {
  PENDING: 'טרם שולם',
  AUTHORIZED: 'אושר',
  PAID: 'שולם',
  FAILED: 'נכשל',
  REFUNDED: 'הוחזר',
  PARTIALLY_REFUNDED: 'הוחזר חלקית',
};

/** The workshop's own progress, kept in step with the order's status. */
const FULFILLMENT_FOR: Partial<Record<OrderStatus, Prisma.OrderUpdateInput['fulfillmentStatus']>> =
  {
    PROCESSING: 'IN_PRODUCTION',
    READY: 'READY',
    SHIPPED: 'SHIPPED',
    DELIVERED: 'DELIVERED',
    COMPLETED: 'DELIVERED',
    CANCELLED: 'CANCELLED',
  };

export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === 'string' && value in ORDER_STATUS_LABELS;
}

export interface OrderListFilter {
  readonly status?: OrderStatus | 'OPEN';
  readonly query?: string;
}

/** Statuses that still need the workshop's hand. */
const OPEN_STATUSES: OrderStatus[] = ['PENDING_PAYMENT', 'PAID', 'PROCESSING', 'READY', 'SHIPPED'];

export async function listOrders(filter: OrderListFilter = {}) {
  const where: Prisma.OrderWhereInput = {};
  if (filter.status === 'OPEN') where.status = { in: OPEN_STATUSES };
  else if (filter.status) where.status = filter.status;

  const query = filter.query?.trim();
  if (query) {
    const digits = query.replace(/\D/g, '');
    // Phones are stored as typed ("050-1234567"), so they are compared digit
    // for digit, whatever dashes or spaces either side has.
    const phoneMatches =
      digits.length >= 4
        ? await prisma.$queryRaw<{ id: string }[]>`
            SELECT "id" FROM "Order"
             WHERE regexp_replace("phone", '\\D', '', 'g') LIKE ${`%${digits}%`}`
        : [];
    where.OR = [
      { customerName: { contains: query, mode: 'insensitive' } },
      { email: { contains: query, mode: 'insensitive' } },
      ...(phoneMatches.length ? [{ id: { in: phoneMatches.map((row) => row.id) } }] : []),
      ...(digits && digits.length <= 9 ? [{ orderNumber: Number(digits) }] : []),
    ];
  }

  return prisma.order.findMany({
    where,
    orderBy: { placedAt: 'desc' },
    take: 200,
    select: {
      id: true,
      orderNumber: true,
      placedAt: true,
      customerName: true,
      phone: true,
      totalAgorot: true,
      status: true,
      paymentStatus: true,
      _count: { select: { items: true } },
    },
  });
}

/** How many orders sit in each status, for the filter tabs. */
export async function countOrdersByStatus(): Promise<Record<string, number>> {
  const groups = await prisma.order.groupBy({ by: ['status'], _count: { _all: true } });
  const counts: Record<string, number> = {};
  for (const group of groups) counts[group.status] = group._count._all;
  counts.OPEN = OPEN_STATUSES.reduce((sum, status) => sum + (counts[status] ?? 0), 0);
  return counts;
}

export async function getOrderForAdmin(orderNumber: number) {
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: {
      items: { orderBy: { createdAt: 'asc' } },
      addresses: true,
      statusEvents: {
        orderBy: { createdAt: 'desc' },
        include: { actor: { select: { displayName: true, email: true } } },
      },
      payments: { orderBy: { createdAt: 'desc' } },
    },
  });
  if (!order) return null;

  return {
    ...order,
    lines: order.items.map((item) => ({
      ...item,
      details: [
        ...readSelections(item.selections),
        ...renderPersonalizationSnapshot(parsePersonalizationSnapshot(item.customization)).map(
          (entry) => ({ label: entry.labelHe, value: entry.displayValue }),
        ),
      ],
    })),
  };
}

export async function changeOrderStatus(input: {
  readonly orderId: string;
  readonly toStatus: OrderStatus;
  readonly note: string | null;
  readonly actorUserId: string;
}): Promise<'changed' | 'unchanged' | 'missing'> {
  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    select: { status: true },
  });
  if (!order) return 'missing';
  if (order.status === input.toStatus && !input.note) return 'unchanged';

  const fulfillment = FULFILLMENT_FOR[input.toStatus];
  await prisma.$transaction([
    prisma.order.update({
      where: { id: input.orderId },
      data: { status: input.toStatus, ...(fulfillment ? { fulfillmentStatus: fulfillment } : {}) },
    }),
    prisma.orderStatusEvent.create({
      data: {
        orderId: input.orderId,
        fromStatus: order.status,
        toStatus: input.toStatus,
        actorUserId: input.actorUserId,
        note: input.note,
      },
    }),
  ]);

  // A cancelled order gives back any stock it was holding. Each release is
  // idempotent, so a second cancellation releases nothing twice.
  if (input.toStatus === 'CANCELLED') {
    const holds = await prisma.inventoryReservation.findMany({
      where: { orderId: input.orderId, status: 'ACTIVE' },
      select: { id: true },
    });
    for (const hold of holds) {
      await releaseReservation(prisma, hold.id, { actorUserId: input.actorUserId });
    }
  }

  return 'changed';
}

export async function saveOrderNotes(orderId: string, notes: string): Promise<void> {
  await prisma.order.update({
    where: { id: orderId },
    data: { notesInternal: notes.trim() || null },
  });
}
