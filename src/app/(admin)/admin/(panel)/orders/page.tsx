import type { Metadata } from 'next';
import Link from 'next/link';

import { StatusPill, StatusTabs } from '@/components/admin/StatusTabs';
import { INPUT } from '@/components/admin/styles';
import { formatAgorot, formatDateTime } from '@/lib/admin/format';
import {
  countOrdersByStatus,
  isOrderStatus,
  listOrders,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
} from '@/lib/admin/orders';
import { requireAdminPage } from '@/lib/admin/session';
import { formatOrderNumber } from '@/lib/orders/order-number';

export const metadata: Metadata = { title: 'הזמנות' };

const TABS = [
  { value: 'OPEN', label: 'פתוחות' },
  { value: 'PENDING_PAYMENT', label: ORDER_STATUS_LABELS.PENDING_PAYMENT },
  { value: 'PROCESSING', label: ORDER_STATUS_LABELS.PROCESSING },
  { value: 'READY', label: ORDER_STATUS_LABELS.READY },
  { value: 'SHIPPED', label: ORDER_STATUS_LABELS.SHIPPED },
  { value: 'COMPLETED', label: ORDER_STATUS_LABELS.COMPLETED },
  { value: 'CANCELLED', label: ORDER_STATUS_LABELS.CANCELLED },
] as const;

function toneFor(status: string) {
  if (status === 'PENDING_PAYMENT' || status === 'PAID') return 'attention' as const;
  if (status === 'COMPLETED' || status === 'DELIVERED') return 'done' as const;
  if (status === 'CANCELLED' || status === 'REFUNDED') return 'off' as const;
  return 'neutral' as const;
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const status = isOrderStatus(params.status) ? params.status : 'OPEN';
  const query = params.q?.trim().slice(0, 100) ?? '';

  const [orders, counts] = await Promise.all([
    listOrders({ status, query }),
    countOrdersByStatus(),
  ]);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-2xl font-bold">הזמנות</h1>
        <form className="flex gap-2" role="search">
          {status !== 'OPEN' && <input type="hidden" name="status" value={status} />}
          <label htmlFor="order-search" className="sr-only">
            חיפוש הזמנה
          </label>
          <input
            id="order-search"
            name="q"
            defaultValue={query}
            placeholder="מספר הזמנה, שם, טלפון או אימייל"
            className={`${INPUT} w-72`}
          />
          <button
            type="submit"
            className="border-border-field hover:border-accent border px-4 text-sm"
          >
            חיפוש
          </button>
        </form>
      </div>

      <div className="mt-6">
        <StatusTabs
          basePath="/admin/orders"
          current={status}
          tabs={TABS}
          counts={counts}
          extraParams={query ? { q: query } : undefined}
        />
      </div>

      {orders.length === 0 ? (
        <p className="text-muted-foreground mt-10">
          {query ? 'לא נמצאו הזמנות שמתאימות לחיפוש.' : 'אין הזמנות בסטטוס הזה.'}
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[44rem] text-sm">
            <thead>
              <tr className="border-border text-muted-foreground border-b text-start">
                <th className="py-2 pe-4 text-start font-medium">הזמנה</th>
                <th className="py-2 pe-4 text-start font-medium">תאריך</th>
                <th className="py-2 pe-4 text-start font-medium">לקוח</th>
                <th className="py-2 pe-4 text-start font-medium">פריטים</th>
                <th className="py-2 pe-4 text-start font-medium">סכום</th>
                <th className="py-2 pe-4 text-start font-medium">תשלום</th>
                <th className="py-2 text-start font-medium">סטטוס</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-border hover:bg-muted/50 border-b">
                  <td className="py-3 pe-4">
                    <Link
                      href={`/admin/orders/${order.orderNumber}`}
                      className="font-semibold underline-offset-4 hover:underline"
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
                    </div>
                  </td>
                  <td className="py-3 pe-4 tabular-nums">{order._count.items}</td>
                  <td className="py-3 pe-4 whitespace-nowrap tabular-nums">
                    {formatAgorot(order.totalAgorot)}
                  </td>
                  <td className="text-muted-foreground py-3 pe-4">
                    {PAYMENT_STATUS_LABELS[order.paymentStatus] ?? order.paymentStatus}
                  </td>
                  <td className="py-3">
                    <StatusPill
                      label={ORDER_STATUS_LABELS[order.status]}
                      tone={toneFor(order.status)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
