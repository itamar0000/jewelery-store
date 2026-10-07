import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ActionForm } from '@/components/admin/ActionForm';
import { StatusPill } from '@/components/admin/StatusTabs';
import { INPUT, LABEL } from '@/components/admin/styles';
import { formatAgorot, formatDateTime } from '@/lib/admin/format';
import { updateRequestAction } from '@/lib/admin/panel-actions';
import {
  changeAreaLabels,
  getRequestForAdmin,
  jewelryTypeLabel,
  readRequestSnapshot,
  REQUEST_STATUS_LABELS,
  REQUEST_STATUSES,
} from '@/lib/admin/requests';
import { getAdminUser, requireAdminPage } from '@/lib/admin/session';
import { prisma } from '@/lib/db';
import { notFoundMetadata } from '@/lib/seo/not-found';
import { formatOrderNumber } from '@/lib/orders/order-number';

type Params = Promise<{ number: string }>;

function parseNumber(raw: string): number | null {
  return /^\d{1,9}$/.test(raw) ? Number(raw) : null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  // Nothing about a request - not even that it exists - before sign-in.
  if (!(await getAdminUser())) return { title: 'ניהול' };
  const { number } = await params;
  const value = parseNumber(number);
  const request = value
    ? await prisma.customRequest.findUnique({
        where: { requestNumber: value },
        select: { id: true },
      })
    : null;
  if (!value || !request) return notFoundMetadata;
  return { title: `בקשה #${value}` };
}

export default async function AdminRequestPage({ params }: { params: Params }) {
  await requireAdminPage();
  const { number } = await params;
  const requestNumber = parseNumber(number);
  const request = requestNumber ? await getRequestForAdmin(requestNumber) : null;
  if (!request) notFound();

  const model = readRequestSnapshot(request.productSnapshot);
  const changes = changeAreaLabels(request.changeAreas, request.product?.productType ?? null);
  const whatsapp = request.phone?.replace(/\D/g, '').replace(/^0/, '972');

  return (
    <>
      <Link href="/admin/requests" className="text-muted-foreground text-sm hover:underline">
        → כל הבקשות
      </Link>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">בקשה #{request.requestNumber}</h1>
        <StatusPill label={REQUEST_STATUS_LABELS[request.status]} />
      </div>
      <p className="text-muted-foreground mt-1 text-sm">
        התקבלה {formatDateTime(request.createdAt)}
      </p>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-10 text-sm">
          <section aria-labelledby="request-heading">
            <h2 id="request-heading" className="text-lg font-bold">
              הבקשה
            </h2>
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
              <dt className="text-muted-foreground">סוג</dt>
              <dd>{jewelryTypeLabel(request.jewelryType)}</dd>
              {model && (
                <>
                  <dt className="text-muted-foreground">לפי דגם</dt>
                  <dd>
                    {model.slug ? (
                      <Link
                        href={`/product/${model.slug}`}
                        target="_blank"
                        className="underline underline-offset-4"
                      >
                        {model.nameHe}
                      </Link>
                    ) : (
                      model.nameHe
                    )}
                    {model.choices.length > 0 && (
                      <span className="text-muted-foreground">
                        {' '}
                        (
                        {model.choices
                          .map((choice) => `${choice.labelHe}: ${choice.valueHe}`)
                          .join(', ')}
                        )
                      </span>
                    )}
                  </dd>
                </>
              )}
              {changes.length > 0 && (
                <>
                  <dt className="text-muted-foreground">לשנות</dt>
                  <dd>{changes.join(', ')}</dd>
                </>
              )}
              {request.budgetAgorot !== null && (
                <>
                  <dt className="text-muted-foreground">תקציב</dt>
                  <dd>{formatAgorot(request.budgetAgorot)}</dd>
                </>
              )}
            </dl>
            <p className="bg-muted mt-4 p-4 whitespace-pre-line">{request.description}</p>
            {request.extraDetails && (
              <p className="mt-3 whitespace-pre-line">{request.extraDetails}</p>
            )}
          </section>

          <section aria-labelledby="history-heading">
            <h2 id="history-heading" className="text-lg font-bold">
              היסטוריה
            </h2>
            {request.events.length === 0 ? (
              <p className="text-muted-foreground mt-3">עוד לא היו עדכונים.</p>
            ) : (
              <ol className="mt-3 space-y-3">
                {request.events.map((event) => (
                  <li key={event.id} className="border-border border-s-2 ps-3">
                    <p className="font-medium">{REQUEST_STATUS_LABELS[event.toStatus]}</p>
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
          <section aria-labelledby="contact-heading" className="text-sm">
            <h2 id="contact-heading" className="text-lg font-bold">
              פרטי קשר
            </h2>
            <p className="mt-2 font-medium">{request.fullName}</p>
            {request.phone && (
              <p className="flex gap-3">
                <a href={`tel:${request.phone}`} className="underline-offset-4 hover:underline">
                  <bdi dir="ltr">{request.phone}</bdi>
                </a>
                {whatsapp && (
                  <a
                    href={`https://wa.me/${whatsapp}`}
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-4"
                  >
                    וואטסאפ
                  </a>
                )}
              </p>
            )}
            {request.email && (
              <p>
                <a href={`mailto:${request.email}`} className="underline-offset-4 hover:underline">
                  <bdi dir="ltr">{request.email}</bdi>
                </a>
              </p>
            )}
            {request.linkedOrder && (
              <p className="mt-2">
                הזמנה מקושרת:{' '}
                <Link
                  href={`/admin/orders/${request.linkedOrder.orderNumber}`}
                  className="underline underline-offset-4"
                >
                  <bdi>{formatOrderNumber(request.linkedOrder.orderNumber)}</bdi>
                </Link>
              </p>
            )}
          </section>

          <section aria-labelledby="update-heading" className="border-border border p-4">
            <h2 id="update-heading" className="font-bold">
              טיפול בבקשה
            </h2>
            <ActionForm action={updateRequestAction} submitLabel="שמירה">
              <input type="hidden" name="requestId" value={request.id} />

              <label htmlFor="request-status" className={`${LABEL} mt-3 block`}>
                סטטוס
              </label>
              <select
                id="request-status"
                name="status"
                defaultValue={request.status}
                className={`${INPUT} mt-1.5`}
              >
                {REQUEST_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {REQUEST_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>

              <label htmlFor="request-quote" className={`${LABEL} mt-3 block`}>
                הצעת מחיר (₪)
              </label>
              <input
                id="request-quote"
                name="quote"
                inputMode="decimal"
                dir="ltr"
                defaultValue={request.quoteAgorot !== null ? String(request.quoteAgorot / 100) : ''}
                className={`${INPUT} mt-1.5`}
              />
              {request.quotedAt && (
                <p className="text-muted-foreground mt-1 text-xs">
                  נשלחה {formatDateTime(request.quotedAt)}
                </p>
              )}

              <label htmlFor="request-quote-notes" className={`${LABEL} mt-3 block`}>
                פירוט ההצעה
              </label>
              <textarea
                id="request-quote-notes"
                name="quoteNotes"
                rows={3}
                defaultValue={request.quoteNotes ?? ''}
                className={`${INPUT} mt-1.5`}
              />

              <label htmlFor="request-internal" className={`${LABEL} mt-3 block`}>
                הערות פנימיות
              </label>
              <textarea
                id="request-internal"
                name="internalNotes"
                rows={3}
                defaultValue={request.internalNotes ?? ''}
                className={`${INPUT} mt-1.5`}
              />

              <label htmlFor="request-note" className={`${LABEL} mt-3 block`}>
                הערה להיסטוריה <span className="text-muted-foreground font-normal">(לא חובה)</span>
              </label>
              <textarea id="request-note" name="note" rows={2} className={`${INPUT} mt-1.5`} />
            </ActionForm>
          </section>
        </aside>
      </div>
    </>
  );
}
