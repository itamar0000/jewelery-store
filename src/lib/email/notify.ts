import { getOrderForAdmin } from '@/lib/admin/orders';
import { jewelryTypeLabel, readRequestSnapshot } from '@/lib/admin/requests';
import { prisma } from '@/lib/db';
import { env } from '@/lib/env';

import { buildEmailConfig, sendEmail, splitAddresses } from './send';
import {
  customerOrderConfirmedEmail,
  customerOrderShippedEmail,
  customerRequestReceivedEmail,
  ownerNewOrderEmail,
  ownerNewRequestEmail,
  type EmailContent,
  type OrderEmailData,
} from './templates';

/**
 * Who is told what, and when.
 *
 *   New order, payment by the site's gateway ... the shop hears once it is PAID
 *                                                (`notifyOrderPaid`, from the
 *                                                gateway's webhook), not for
 *                                                every abandoned payment page.
 *   New order, no gateway configured ........... the shop hears at once
 *                                                (`notifyNewOrder`), because
 *                                                it must arrange payment.
 *   Staff press "התקבל תשלום" / webhook PAID .... shop + customer
 *   Staff mark an order shipped ................ customer, with tracking
 *   New custom request ......................... shop + customer (if email)
 *
 * Every function here swallows its own failures: an email that does not go
 * must never undo or block the thing it reports. Call them inside `after()`
 * so the visitor's response does not wait for the provider either.
 */

const config = () => buildEmailConfig(env);
const ownerAddresses = () => splitAddresses(env.ORDER_NOTIFY_TO);
const absolute = (path: string) => new URL(path, env.NEXT_PUBLIC_SITE_URL).toString();

/** True when an API key and sender are set - shown in the admin's help. */
export function emailConfigured(): boolean {
  return config() !== null;
}

async function send(to: readonly string[], content: EmailContent): Promise<void> {
  await sendEmail(config(), { to, ...content });
}

type OrderKey = { readonly id: string } | { readonly orderNumber: number };

async function orderData(key: OrderKey): Promise<OrderEmailData | null> {
  const found = await prisma.order.findUnique({ where: key, select: { orderNumber: true } });
  const order = found ? await getOrderForAdmin(found.orderNumber) : null;
  if (!order) return null;
  const address = order.addresses.find((entry) => entry.type === 'SHIPPING') ?? null;
  return {
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    email: order.email,
    phone: order.phone,
    totalAgorot: order.totalAgorot,
    trackingNumber: order.trackingNumber,
    lines: order.lines.map((line) => ({
      productNameHe: line.productNameHe,
      variantLabelHe: line.variantLabelHe,
      quantity: line.quantity,
      lineTotalAgorot: line.lineTotalAgorot,
      prepDays: line.prepDays,
      details: line.details,
    })),
    address: address
      ? {
          fullName: address.fullName,
          street: address.street,
          houseNumber: address.houseNumber,
          apartment: address.apartment,
          city: address.city,
        }
      : null,
  };
}

async function guarded(label: string, work: () => Promise<void>): Promise<void> {
  if (!config()) return;
  try {
    await work();
  } catch (error) {
    console.error(`[email] ${label} failed:`, error instanceof Error ? error.message : error);
  }
}

/** The shop hears about an order that still has to be paid for by hand. */
export function notifyNewOrder(orderNumber: number): Promise<void> {
  return guarded('new-order notice', async () => {
    const order = await orderData({ orderNumber });
    if (!order) return;
    await send(
      ownerAddresses(),
      ownerNewOrderEmail(order, {
        paid: false,
        adminUrl: absolute(`/admin/orders/${order.orderNumber}`),
      }),
    );
  });
}

/** Payment arrived: the shop gets the order, the customer a confirmation. */
export function notifyOrderPaid(orderId: string): Promise<void> {
  return guarded('paid notice', async () => {
    const order = await orderData({ id: orderId });
    if (!order) return;
    await Promise.all([
      send(
        ownerAddresses(),
        ownerNewOrderEmail(order, {
          paid: true,
          adminUrl: absolute(`/admin/orders/${order.orderNumber}`),
        }),
      ),
      send([order.email], customerOrderConfirmedEmail(order)),
    ]);
  });
}

/** The parcel left: the customer is told, with the tracking number if typed. */
export function notifyOrderShipped(orderId: string): Promise<void> {
  return guarded('shipped notice', async () => {
    const order = await orderData({ id: orderId });
    if (!order) return;
    await send([order.email], customerOrderShippedEmail(order));
  });
}

/** A custom-design request arrived. */
export function notifyNewRequest(requestNumber: number): Promise<void> {
  return guarded('request notice', async () => {
    const request = await prisma.customRequest.findUnique({
      where: { requestNumber },
      select: {
        requestNumber: true,
        fullName: true,
        phone: true,
        email: true,
        jewelryType: true,
        description: true,
        productSnapshot: true,
      },
    });
    if (!request) return;
    const data = {
      requestNumber: request.requestNumber,
      fullName: request.fullName,
      phone: request.phone,
      email: request.email,
      jewelryTypeLabel: jewelryTypeLabel(request.jewelryType),
      modelName: readRequestSnapshot(request.productSnapshot)?.nameHe ?? null,
      description: request.description,
    };
    await Promise.all([
      send(
        ownerAddresses(),
        ownerNewRequestEmail(data, {
          adminUrl: absolute(`/admin/requests/${request.requestNumber}`),
        }),
      ),
      request.email ? send([request.email], customerRequestReceivedEmail(data)) : Promise.resolve(),
    ]);
  });
}
