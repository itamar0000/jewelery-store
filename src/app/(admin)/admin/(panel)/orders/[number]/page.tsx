import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ActionForm } from '@/components/admin/ActionForm';
import { OrderProgress } from '@/components/admin/OrderProgress';
import { StatusPill } from '@/components/admin/StatusTabs';
import { INPUT, LABEL, LINK_BUTTON, WHATSAPP_BUTTON } from '@/components/admin/styles';
import { resolveImageUrl } from '@/lib/catalog/images';
import { formatAgorot, formatDateTime } from '@/lib/admin/format';
import {
  canCancel,
  canMarkPaid,
  canMarkRefunded,
  MANUAL_PAYMENT_METHODS,
  nextStep,
  previousStatus,
} from '@/lib/admin/order-steps';
import { MANUAL_FIX_FORBIDDEN } from '@/lib/admin/order-workflow';
import {
  getOrderForAdmin,
  ORDER_STATUS_LABELS,
  ORDER_STATUSES,
  PAYMENT_STATUS_LABELS,
} from '@/lib/admin/orders';
import {
  cancelOrderAction,
  changeOrderStatusAction,
  markOrderPaidAction,
  markOrderRefundedAction,
  moveOrderStepAction,
  saveOrderNotesAction,
} from '@/lib/admin/panel-actions';
import { getAdminUser, requireAdminPage } from '@/lib/admin/session';
import { orderWhatsAppMessage, whatsAppLink } from '@/lib/admin/whatsapp';
import { prisma } from '@/lib/db';
import { emailConfigured } from '@/lib/email/notify';
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

/**
 * One order, arranged around the question "what do I do now?" (D4D.42).
 *
 * The top panel shows where the order is and offers exactly one next action
 * as a large button - record the payment, start making it, mark it ready,
 * ship it. WhatsApp, a phone call and a printable job sheet sit beside it.
 * Everything rarer - cancelling, a refund, a manual status fix - is lower on
 * the page and asks before it acts.
 */
export default async function AdminOrderPage({ params }: { params: Params }) {
  await requireAdminPage();
  const { number } = await params;
  const orderNumber = parseNumber(number);
  const order = orderNumber ? await getOrderForAdmin(orderNumber) : null;
  if (!order) notFound();

  const address = order.addresses.find((entry) => entry.type === 'SHIPPING');
  const step = nextStep(order.status);
  const back = previousStatus(order.status);
  const showMarkPaid = canMarkPaid(order.status, order.paymentStatus);
  const showRefund = canMarkRefunded(order.status, order.paymentStatus);
  const whatsapp = whatsAppLink(order.phone, orderWhatsAppMessage(order));
  const total = formatAgorot(order.totalAgorot);
  const orderId = <input type="hidden" name="orderId" value={order.id} />;
  const fixChoices = ORDER_STATUSES.filter(
    (status) => !MANUAL_FIX_FORBIDDEN.includes(status) || status === order.status,
  );

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
        התקבלה {formatDateTime(order.placedAt)} · {order.customerName} · {total} · תשלום:{' '}
        {PAYMENT_STATUS_LABELS[order.paymentStatus] ?? order.paymentStatus}
      </p>

      {/* ------------------------------------------------ what to do now */}
      <section
        aria-labelledby="now-heading"
        className="border-border-strong mt-6 space-y-6 border-2 p-5 sm:p-6"
      >
        <h2 id="now-heading" className="sr-only">
          מה עושים עכשיו
        </h2>
        <OrderProgress status={order.status} />

        {showMarkPaid && (
          <div>
            <p className="text-lg font-bold">
              {order.status === 'CANCELLED' ? 'הלקוח שילם בכל זאת?' : 'מחכה לתשלום של '}
              {order.status !== 'CANCELLED' && <bdi>{total}</bdi>}
            </p>
            <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
              {order.status === 'CANCELLED'
                ? 'ההזמנה בוטלה כי לא שולמה. אם הכסף התקבל, רשמו אותו כאן וההזמנה תחזור לטיפול.'
                : `לוחצים רק אחרי שהכסף התקבל בפועל - בקישור תשלום, בביט, בהעברה או במזומן.${emailConfigured() ? ' הלקוח יקבל אישור במייל.' : ''}`}
            </p>
            <ActionForm
              action={markOrderPaidAction}
              submitLabel="התקבל תשלום"
              size="lg"
              confirm={`לאשר שהתקבל תשלום של ${total} עבור הזמנה ${order.orderNumber}?`}
              className="mt-4"
            >
              {orderId}
              <fieldset>
                <legend className={LABEL}>איך שולם?</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {MANUAL_PAYMENT_METHODS.map((method, index) => (
                    <label
                      key={method.value}
                      className="border-border has-[:checked]:border-foreground has-[:checked]:bg-muted flex min-h-11 cursor-pointer items-center gap-2 border px-3 text-sm"
                    >
                      <input
                        type="radio"
                        name="method"
                        value={method.value}
                        defaultChecked={index === 0}
                        className="size-4"
                      />
                      {method.label}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label htmlFor="paid-note" className={`${LABEL} mt-4 block`}>
                הערה <span className="text-muted-foreground font-normal">(לא חובה)</span>
              </label>
              <input id="paid-note" name="note" className={`${INPUT} mt-1.5 max-w-md`} />
            </ActionForm>
          </div>
        )}

        {step && (
          <div>
            <ActionForm action={moveOrderStepAction} submitLabel={step.label} size="lg">
              {orderId}
              <input type="hidden" name="toStatus" value={step.toStatus} />
              <p className="text-muted-foreground text-sm">{step.hint}</p>
              {step.toStatus === 'SHIPPED' && (
                <>
                  <label htmlFor="tracking" className={`${LABEL} mt-3 block`}>
                    מספר מעקב של השליח{' '}
                    <span className="text-muted-foreground font-normal">(לא חובה)</span>
                  </label>
                  <input
                    id="tracking"
                    name="trackingNumber"
                    dir="ltr"
                    maxLength={60}
                    className={`${INPUT} mt-1.5 max-w-xs`}
                  />
                  {emailConfigured() && (
                    <p className="text-muted-foreground mt-1 text-xs">
                      הלקוח יקבל מייל שההזמנה נשלחה, עם המספר הזה.
                    </p>
                  )}
                </>
              )}
            </ActionForm>
          </div>
        )}

        {showRefund && (
          <div>
            <p className="text-lg font-bold">צריך להחזיר ללקוח {total}</p>
            <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
              ההזמנה בוטלה אחרי שכבר שולמה. מחזירים את הכסף באותה דרך שבה שולם (בחברת הסליקה, בביט
              או בהעברה), ואז לוחצים כאן כדי לרשום את זה.
            </p>
            <ActionForm
              action={markOrderRefundedAction}
              submitLabel="הכסף הוחזר ללקוח"
              size="lg"
              confirm="לרשום שהכסף הוחזר ללקוח?"
              className="mt-2"
            >
              {orderId}
            </ActionForm>
          </div>
        )}

        {(order.status === 'DELIVERED' || order.status === 'COMPLETED') && (
          <p className="text-success text-lg font-bold">ההזמנה הושלמה. אין צורך לעשות דבר.</p>
        )}

        <div className="border-border flex flex-wrap gap-3 border-t pt-5">
          {whatsapp && (
            <a href={whatsapp} target="_blank" rel="noreferrer" className={WHATSAPP_BUTTON}>
              וואטסאפ ללקוח
            </a>
          )}
          <a href={`tel:${order.phone}`} className={LINK_BUTTON}>
            התקשרות <bdi dir="ltr">{order.phone}</bdi>
          </a>
          <Link
            href={`/admin/orders/${order.orderNumber}/print`}
            target="_blank"
            className={LINK_BUTTON}
          >
            הדפסת דף עבודה
          </Link>
        </div>
        {whatsapp && (
          <p className="text-muted-foreground -mt-3 text-xs">
            הוואטסאפ נפתח עם הודעה מוכנה שמתאימה לשלב של ההזמנה. אפשר לשנות אותה לפני השליחה.
          </p>
        )}

        {back && (
          <ActionForm
            action={moveOrderStepAction}
            submitLabel={`החזרה לשלב הקודם (${ORDER_STATUS_LABELS[back]})`}
            variant="secondary"
            confirm={`להחזיר את ההזמנה לשלב "${ORDER_STATUS_LABELS[back]}"?`}
            className="[&_button]:h-9 [&_button]:text-xs"
          >
            {orderId}
            <input type="hidden" name="toStatus" value={back} />
          </ActionForm>
        )}
      </section>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-10">
          <section aria-labelledby="items-heading">
            <h2 id="items-heading" className="text-lg font-bold">
              מה הוזמן
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
              <dd className="text-end font-semibold">{total}</dd>
            </dl>
          </section>

          <section aria-labelledby="history-heading">
            <h2 id="history-heading" className="text-lg font-bold">
              היסטוריה
            </h2>
            {order.statusEvents.length === 0 ? (
              <p className="text-muted-foreground mt-3 text-sm">עוד לא היו שינויים.</p>
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
                      {event.actor
                        ? ` · ${event.actor.displayName ?? event.actor.email}`
                        : event.fromStatus
                          ? ' · אוטומטי'
                          : ''}
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
                  {address.phone && address.phone !== order.phone && (
                    <>
                      {' '}
                      · <bdi dir="ltr">{address.phone}</bdi>
                    </>
                  )}
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
            {order.trackingNumber && (
              <p className="mt-3">
                מספר מעקב: <bdi dir="ltr">{order.trackingNumber}</bdi>
              </p>
            )}
          </section>

          <section aria-labelledby="notes-heading">
            <h2 id="notes-heading" className="font-bold">
              הערות פנימיות
            </h2>
            <p className="text-muted-foreground mt-1 text-xs">רק אתם רואים אותן. הלקוח לא.</p>
            <ActionForm action={saveOrderNotesAction} submitLabel="שמירת הערות">
              {orderId}
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

          {canCancel(order.status) && (
            <section aria-labelledby="cancel-heading" className="border-border border p-4">
              <h2 id="cancel-heading" className="font-bold">
                ביטול הזמנה
              </h2>
              <p className="text-muted-foreground mt-1 text-xs">
                {order.paymentStatus === 'PAID'
                  ? 'ההזמנה כבר שולמה. אחרי הביטול יופיע כפתור לרישום ההחזר ללקוח.'
                  : 'לא שולם עליה כסף, אז אין מה להחזיר.'}
              </p>
              <ActionForm
                action={cancelOrderAction}
                submitLabel="ביטול ההזמנה"
                variant="danger"
                confirm={`לבטל את הזמנה ${order.orderNumber}? אפשר לתקן אחר כך דרך "תיקון ידני".`}
              >
                {orderId}
                <label htmlFor="cancel-reason" className={`${LABEL} mt-3 block`}>
                  סיבה <span className="text-muted-foreground font-normal">(לא חובה)</span>
                </label>
                <input id="cancel-reason" name="reason" className={`${INPUT} mt-1.5`} />
              </ActionForm>
            </section>
          )}

          <details className="border-border border p-4 text-sm">
            <summary className="cursor-pointer font-medium">תיקון ידני (למקרים חריגים)</summary>
            <p className="text-muted-foreground mt-2 text-xs">
              רק אם הכפתורים למעלה לא מתאימים. תשלום והחזר כספי נרשמים בכפתורים שלהם.
            </p>
            <ActionForm action={changeOrderStatusAction} submitLabel="עדכון">
              {orderId}
              <label htmlFor="order-status" className={`${LABEL} mt-3 block`}>
                סטטוס
              </label>
              <select
                id="order-status"
                name="status"
                defaultValue={order.status}
                className={`${INPUT} mt-1.5`}
              >
                {fixChoices.map((status) => (
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
          </details>
        </aside>
      </div>
    </>
  );
}
