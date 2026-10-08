import { hashToken, isWellFormedToken } from '@/lib/cart/token';
import { resolveImageUrl } from '@/lib/catalog/images';
import { prisma } from '@/lib/db';
import { fromAgorot, type Money } from '@/lib/money';
import {
  parsePersonalizationSnapshot,
  renderPersonalizationSnapshot,
} from '@/lib/personalization/snapshot';

import { formatOrderNumber } from './order-number';

/**
 * An order, read back by the guest who placed it.
 *
 * FOUND BY TOKEN, NEVER BY NUMBER. Order numbers are sequential and printed on
 * the page, so a lookup by number would hand anyone the next customer's
 * address. The only key accepted here is the random token the shopper's
 * browser was given when the order was placed (src/lib/cart/token.ts),
 * compared by its hash.
 *
 * READS ONLY THE ORDER'S OWN SNAPSHOTS. Names, labels and personalisation come
 * from the order lines, never from the catalogue, so this page shows what was
 * ordered even after the product changes (principle 9).
 */

export interface PlacedOrderView {
  readonly orderNumber: string;
  readonly status: string;
  readonly paymentStatus: string;
  readonly email: string;
  readonly lines: readonly {
    readonly id: string;
    readonly productName: string;
    readonly variantLabel: string;
    /** The photograph frozen on the line (`OrderItem.imageKey`), resolved. */
    readonly imageUrl: string | null;
    readonly details: readonly { readonly label: string; readonly value: string }[];
    readonly quantity: number;
    readonly lineTotal: Money;
    readonly prepDays: number | null;
  }[];
  /** Units across the lines. */
  readonly itemCount: number;
  readonly subtotal: Money;
  /** The coupon's discount, and its code as typed (D4D.33). */
  readonly discount: Money;
  readonly couponCode: string | null;
  readonly shipping: Money;
  readonly total: Money;
  readonly vat: Money | null;
  readonly vatRateBps: number | null;
  readonly shipTo: { readonly fullName: string; readonly city: string } | null;
}

export async function getOrderByAccessToken(
  token: string | null | undefined,
): Promise<PlacedOrderView | null> {
  if (!isWellFormedToken(token)) return null;

  const order = await prisma.order.findUnique({
    where: { accessTokenHash: hashToken(token) },
    select: {
      orderNumber: true,
      status: true,
      paymentStatus: true,
      email: true,
      subtotalAgorot: true,
      discountAgorot: true,
      couponCodeUsed: true,
      shippingAgorot: true,
      totalAgorot: true,
      vatRateBps: true,
      vatAmountAgorot: true,
      items: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          productNameHe: true,
          variantLabelHe: true,
          imageKey: true,
          selections: true,
          customization: true,
          quantity: true,
          lineTotalAgorot: true,
          prepDays: true,
        },
      },
      addresses: {
        where: { type: 'SHIPPING' },
        take: 1,
        select: { fullName: true, city: true },
      },
    },
  });

  if (!order) return null;

  return {
    orderNumber: formatOrderNumber(order.orderNumber),
    status: order.status,
    paymentStatus: order.paymentStatus,
    email: order.email,
    lines: order.items.map((item) => ({
      id: item.id,
      productName: item.productNameHe,
      variantLabel: item.variantLabelHe,
      imageUrl: item.imageKey ? resolveImageUrl(item.imageKey) : null,
      details: [
        ...readSelections(item.selections),
        ...renderPersonalizationSnapshot(parsePersonalizationSnapshot(item.customization)).map(
          (entry) => ({ label: entry.labelHe, value: entry.displayValue }),
        ),
      ],
      quantity: item.quantity,
      lineTotal: fromAgorot(item.lineTotalAgorot),
      prepDays: item.prepDays,
    })),
    itemCount: order.items.reduce((count, item) => count + item.quantity, 0),
    subtotal: fromAgorot(order.subtotalAgorot),
    discount: fromAgorot(order.discountAgorot),
    couponCode: order.couponCodeUsed,
    shipping: fromAgorot(order.shippingAgorot),
    total: fromAgorot(order.totalAgorot),
    vat: order.vatAmountAgorot === null ? null : fromAgorot(order.vatAmountAgorot),
    vatRateBps: order.vatRateBps,
    shipTo: order.addresses[0] ?? null,
  };
}

/**
 * What a payment provider is asked to charge, for an order still awaiting
 * payment - and only such an order: a paid or cancelled one is never
 * offered for payment again.
 */
export async function getPayableOrder(token: string | null | undefined): Promise<{
  orderNumber: number;
  totalAgorot: number;
  email: string;
  customerName: string;
} | null> {
  if (!isWellFormedToken(token)) return null;

  return prisma.order.findFirst({
    where: {
      accessTokenHash: hashToken(token),
      status: 'PENDING_PAYMENT',
      paymentStatus: { in: ['PENDING', 'FAILED'] },
    },
    select: { orderNumber: true, totalAgorot: true, email: true, customerName: true },
  });
}

/** `OrderItem.selections` as frozen: `[{ optionLabelHe, valueLabelHe }]`. */
export function readSelections(value: unknown): { label: string; value: string }[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry) => {
    if (typeof entry !== 'object' || entry === null) return [];
    const candidate = entry as Record<string, unknown>;
    return typeof candidate.optionLabelHe === 'string' && typeof candidate.valueLabelHe === 'string'
      ? [{ label: candidate.optionLabelHe, value: candidate.valueLabelHe }]
      : [];
  });
}
