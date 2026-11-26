import type { Metadata } from 'next';
import Link from 'next/link';

import { StatusPill, StatusTabs } from '@/components/admin/StatusTabs';
import { INPUT } from '@/components/admin/styles';
import { formatAgorot, formatDateTime } from '@/lib/admin/format';
import { nextStepHint } from '@/lib/admin/order-steps';
import {
  countOrdersByStatus,
  isOrderStatus,
  listOrders,
  ORDER_STATUS_LABELS,
} from '@/lib/admin/orders';
import { requireAdminPage } from '@/lib/admin/session';
import { formatOrderNumber } from '@/lib/orders/order-number';
import { getPaymentProvider } from '@/lib/payments/provider';

export const metadata: Metadata = { title: 'הזמנות' };

function toneFor(status: string) {
  if (status === 'PENDING_PAYMENT' || status === 'PAID') return 'attention' as const;
  if (status === 'COMPLETED' || status === 'DELIVERED') return 'done' as const;
  if (status === 'CANCELLED' || status === 'REFUNDED') return 'off' as const;
  return 'neutral' as const;
}

/**
 * The orders, opening on "לטיפול": what still needs the workshop's hand.
 * With a payment gateway, unpaid orders are people who left the payment page
 * and sit in their own tab (orders.ts, `openStatuses`).
 */
export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const status = isOrderStatus(params.status) ? params.status : 'OPEN';
  const query = params.q?.trim().slice(0, 100) ?? '';
  const includeUnpaid = !getPaymentProvider();

  const [orders, counts] = await Promise.all([
    listOrders({ status, query, includeUnpaid }),
    countOrdersByStatus(includeUnpaid),
  ]);

  const tabs = [
    { value: 'OPEN', label: 'לטיפול' },
    { value: 'PENDING_PAYMENT', label: ORDER_STATUS_LABELS.PENDING_PAYMENT },
    { value: 'PAID', label: 'שולמו, עוד לא התחלנו' },
    { value: 'PROCESSING', label: ORDER_STATUS_LABELS.PROCESSING },
    { value: 'READY', label: ORDER_STATUS_LABELS.READY },
    { value: 'SHIPPED', label: ORDER_STATUS_LABELS.SHIPPED },
    { value: 'DELIVERED', label: ORDER_STATUS_LABELS.DELIVERED },
    { value: 'CANCELLED', label: ORDER_STATUS_LABELS.CANCELLED },
  ];

  const empty = query
    ? 'לא נמצאו הזמנות שמתאימות לחיפוש.'
    : status === 'OPEN'
      ? 'אין כרגע הזמנות שמחכות לטיפול.'
      : 'אין הזמנות בסטטוס הזה.';

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-2xl font-bold">הזמנות</h1>
        <form className="flex w-full gap-2 sm:w-auto" role="search">
          {status !== 'OPEN' && <input type="hidden" name="status" value={status} />}
          <label htmlFor="order-search" className="sr-only">
            חיפוש הזמנה
          </label>
          <input
            id="order-search"
            name="q"
            type="search"
            defaultValue={query}
            placeholder="מספר הזמנה, שם או טלפון"
            className={`${INPUT} min-h-11 flex-1 sm:w-72`}
          />
          <button
            type="submit"
            className="border-border-field hover:border-accent min-h-11 border px-4 text-sm"
          >
            חיפוש
          </button>
        </form>
      </div>

      <div className="mt-6">
        <StatusTabs
          basePath="/admin/orders"
          current={status}
          tabs={tabs}
          counts={counts}
          extraParams={query ? { q: query } : undefined}
          hideEmpty
        />
      </div>

      {orders.length === 0 ? (
        <p className="text-muted-foreground mt-10">{empty}</p>
      ) : (
        <>
          {/* Phones: one card per order, the whole card a link. */}
          <ul className="mt-6 space-y-3 md:hidden">
            {orders.map((order) => {
              const hint = nextStepHint(order.status, order.paymentStatus);
              return (
                <li key={order.id}>
                  <Link
                    href={`/admin/orders/${order.orderNumber}`}
                    className="border-border hover:border-border-strong block border p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold">
                          <bdi>{formatOrderNumber(order.orderNumber)}</bdi> · {order.customerName}
                        </p>
                        <p className="text-muted-foreground text-sm tabular-nums">
                          {formatDateTime(order.placedAt)}
                          {order.addresses[0]?.city ? ` · ${order.addresses[0].city}` : ''}
                        </p>
                      </div>
                      <StatusPill
                        label={ORDER_STATUS_LABELS[order.status]}
                        tone={toneFor(order.status)}
                      />
                    </div>
                    <div className="mt-2 flex items-end justify-between gap-3 text-sm">
                      <span className="font-medium">{hint ?? ''}</span>
                      <span className="font-semibold tabular-nums">
                        {formatAgorot(order.totalAgorot)}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="mt-6 hidden md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-border text-muted-foreground border-b text-start">
                  <th className="py-2 pe-4 text-start font-medium">הזמנה</th>
                  <th className="py-2 pe-4 text-start font-medium">תאריך</th>
                  <th className="py-2 pe-4 text-start font-medium">לקוח</th>
                  <th className="py-2 pe-4 text-start font-medium">סכום</th>
                  <th className="py-2 pe-4 text-start font-medium">סטטוס</th>
                  <th className="py-2 text-start font-medium">מה הלאה</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-border hover:bg-muted/50 border-b">
                    <td className="py-3 pe-4">
                      <Link
                        href={`/admin/orders/${order.orderNumber}`}
                        className="font-semibold underline underline-offset-4"
                      >
                        <bdi>{formatOrderNumber(order.orderNumber)}</bdi>
                      </Link>
                    </td>
                    <td className="py-3 pe-4 whitespace-nowrap tabular-nums">
                      {formatDateTime(order.placedAt)}
                    </td>
                    <td className="py-3 pe-4">
                      <div>{order.customerName}</div>
                      <div className="text-muted-foreground tabular-nums">
                        <bdi dir="ltr">{order.phone}</bdi>
                        {order.addresses[0]?.city ? ` · ${order.addresses[0].city}` : ''}
                      </div>
                    </td>
                    <td className="py-3 pe-4 whitespace-nowrap tabular-nums">
                      {formatAgorot(order.totalAgorot)}
                      <div className="text-muted-foreground text-xs">
                        {order._count.items} פריטים
                      </div>
                    </td>
                    <td className="py-3 pe-4">
                      <StatusPill
                        label={ORDER_STATUS_LABELS[order.status]}
                        tone={toneFor(order.status)}
                      />
                    </td>
                    <td className="py-3">
                      {nextStepHint(order.status, order.paymentStatus) ?? ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
