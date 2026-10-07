import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ActionForm } from '@/components/admin/ActionForm';
import { StatusPill } from '@/components/admin/StatusTabs';
import { INPUT, LABEL } from '@/components/admin/styles';
import { resolveImageUrl } from '@/lib/catalog/images';
import { formatAgorot, formatDateTime } from '@/lib/admin/format';
import {
  getOrderForAdmin,
  ORDER_STATUS_LABELS,
  ORDER_STATUSES,
  PAYMENT_STATUS_LABELS,
} from '@/lib/admin/orders';
import { changeOrderStatusAction, saveOrderNotesAction } from '@/lib/admin/panel-actions';
import { getAdminUser, requireAdminPage } from '@/lib/admin/session';
import { prisma } from '@/lib/db';
import { notFoundMetadata } from '@/lib/seo/not-found';
import { formatOrderNumber } from '@/lib/orders/order-number';

type Params = Promise<{ number: string }>;

function parseNumber(raw: string): number | null {
  return /^\d{1,9}$/.test(raw) ? Number(raw) : null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  // Nothing about an order - not even that it exists - before sign-in.
  if (!(await getAdminUser())) return { title: 'ניהול' };
  const { number } = await params;
  const value = parseNumber(number);
  const order = value
    ? await prisma.order.findUnique({ where: { orderNumber: value }, select: { id: true } })
    : null;
  if (!value || !order) return notFoundMetadata;
  return { title: `הזמנה ${formatOrderNumber(value)}` };
}

export default async function AdminOrderPage({ params }: { params: Params }) {
  await requireAdminPage();
  const { number } = await params;
  const orderNumber = parseNumber(number);
  const order = orderNumber ? await getOrderForAdmin(orderNumber) : null;
  if (!order) notFound();

  const address = order.addresses.find((entry) => entry.type === 'SHIPPING');

  return (
    <>
      <Link href="/admin/orders" className="text-muted-foreground text-sm hover:underline">
        → כל ההזמנות
      </Link>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">
          הזמנה <bdi>{formatOrderNumber(order.orderNumber)}</bdi>
        </h1>
        <StatusPill label={ORDER_STATUS_LABELS[order.status]} />
      </div>
      <p className="text-muted-foreground mt-1 text-sm">
        התקבלה {formatDateTime(order.placedAt)} · תשלום:{' '}
        {PAYMENT_STATUS_LABELS[order.paymentStatus] ?? order.paymentStatus}
      </p>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-10">
          <section aria-labelledby="items-heading">
            <h2 id="items-heading" className="text-lg font-bold">
              פריטים
            </h2>
            <ul className="divide-border border-border mt-3 divide-y border-y">
              {order.lines.map((line) => {
                const image = line.imageKey ? resolveImageUrl(line.imageKey) : null;
                return (
                  <li key={line.id} className="flex gap-4 py-4">
                    <div className="bg-muted relative size-20 shrink-0 overflow-hidden">
                      {image && (
                        <Image src={image} alt="" fill sizes="80px" className="object-cover" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 text-sm">
                      <p className="font-semibold">{line.productNameHe}</p>
                      <p className="text-muted-foreground">{line.variantLabelHe}</p>
                      {line.details.length > 0 && (
                        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
                          {line.details.map((detail) => (
                            <div key={`${detail.label}-${detail.value}`} className="contents">
                              <dt className="text-muted-foreground">{detail.label}</dt>
                              <dd className="font-medium">{detail.value}</dd>
                            </div>
                          ))}
                        </dl>
                      )}
                      <p className="text-muted-foreground mt-2">
                        מק״ט <bdi dir="ltr">{line.sku}</bdi>
                        {line.prepDays ? ` · זמן הכנה ${line.prepDays} ימי עסקים` : ''}
                      </p>
                    </div>
                    <div className="text-end text-sm tabular-nums">
                      <p>× {line.quantity}</p>
                      <p className="font-semibold">{formatAgorot(line.lineTotalAgorot)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
            <dl className="ms-auto mt-4 grid max-w-xs grid-cols-2 gap-y-1 text-sm tabular-nums">
              <dt className="text-muted-foreground">סכום ביניים</dt>
              <dd className="text-end">{formatAgorot(order.subtotalAgorot)}</dd>
              {order.discountAgorot > 0 && (
                <>
                  <dt className="text-muted-foreground">
                    הנחה{order.couponCodeUsed ? ` (${order.couponCodeUsed})` : ''}
                  </dt>
                  <dd className="text-end">−{formatAgorot(order.discountAgorot)}</dd>
                </>
              )}
              <dt className="text-muted-foreground">משלוח</dt>
              <dd className="text-end">{formatAgorot(order.shippingAgorot)}</dd>
              <dt className="font-semibold">סה״כ</dt>
              <dd className="text-end font-semibold">{formatAgorot(order.totalAgorot)}</dd>
            </dl>
          </section>

          <section aria-labelledby="history-heading">
            <h2 id="history-heading" className="text-lg font-bold">
              היסטוריה
            </h2>
            {order.statusEvents.length === 0 ? (
              <p className="text-muted-foreground mt-3 text-sm">עוד לא היו שינויי סטטוס.</p>
            ) : (
              <ol className="mt-3 space-y-3 text-sm">
                {order.statusEvents.map((event) => (
                  <li key={event.id} className="border-border border-s-2 ps-3">
                    <p>
                      <span className="font-medium">{ORDER_STATUS_LABELS[event.toStatus]}</span>
                      {event.fromStatus && (
                        <span className="text-muted-foreground">
                          {' '}
                          (קודם: {ORDER_STATUS_LABELS[event.fromStatus]})
                        </span>
                      )}
                    </p>
                    <p className="text-muted-foreground">
                      {formatDateTime(event.createdAt)}
                      {event.actor ? ` · ${event.actor.displayName ?? event.actor.email}` : ''}
                    </p>
                    {event.note && <p className="mt-1 whitespace-pre-line">{event.note}</p>}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <aside className="space-y-8">
          <section aria-labelledby="customer-heading" className="text-sm">
            <h2 id="customer-heading" className="text-lg font-bold">
              לקוח
            </h2>
            <p className="mt-2 font-medium">{order.customerName}</p>
            <p>
              <a href={`tel:${order.phone}`} className="underline-offset-4 hover:underline">
                <bdi dir="ltr">{order.phone}</bdi>
              </a>
            </p>
            <p>
              <a href={`mailto:${order.email}`} className="underline-offset-4 hover:underline">
                <bdi dir="ltr">{order.email}</bdi>
              </a>
            </p>
            {address && (
              <div className="mt-4">
                <h3 className="font-medium">כתובת למשלוח</h3>
                <p className="mt-1">
                  {address.fullName}
                  <br />
                  {address.street} {address.houseNumber}
                  {address.apartment ? `, דירה ${address.apartment}` : ''}
                  <br />
                  {address.city}
                  {address.postalCode ? ` ${address.postalCode}` : ''}
                </p>
                {address.instructions && (
                  <p className="text-muted-foreground mt-1">הערות: {address.instructions}</p>
                )}
              </div>
            )}
            {order.shippingMethodLabel && (
              <p className="text-muted-foreground mt-2">שיטת משלוח: {order.shippingMethodLabel}</p>
            )}
          </section>

          <section aria-labelledby="status-heading" className="border-border border p-4">
            <h2 id="status-heading" className="font-bold">
              עדכון סטטוס
            </h2>
            <ActionForm action={changeOrderStatusAction} submitLabel="עדכון">
              <input type="hidden" name="orderId" value={order.id} />
              <label htmlFor="order-status" className={`${LABEL} mt-3 block`}>
                סטטוס
              </label>
              <select
                id="order-status"
                name="status"
                defaultValue={order.status}
                className={`${INPUT} mt-1.5`}
              >
                {ORDER_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {ORDER_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
              <label htmlFor="order-note" className={`${LABEL} mt-3 block`}>
                הערה להיסטוריה <span className="text-muted-foreground font-normal">(לא חובה)</span>
              </label>
              <textarea id="order-note" name="note" rows={2} className={`${INPUT} mt-1.5`} />
            </ActionForm>
            <p className="text-muted-foreground mt-3 text-xs">
              ביטול הזמנה משחרר את המלאי שהיא החזיקה. סטטוס התשלום מתעדכן רק מחברת הסליקה.
            </p>
          </section>

          <section aria-labelledby="notes-heading">
            <h2 id="notes-heading" className="font-bold">
              הערות פנימיות
            </h2>
            <ActionForm action={saveOrderNotesAction} submitLabel="שמירה">
              <input type="hidden" name="orderId" value={order.id} />
              <label htmlFor="order-notes" className="sr-only">
                הערות פנימיות
              </label>
              <textarea
                id="order-notes"
                name="notes"
                rows={4}
                defaultValue={order.notesInternal ?? ''}
                className={`${INPUT} mt-2`}
              />
            </ActionForm>
          </section>
        </aside>
      </div>
    </>
  );
}
