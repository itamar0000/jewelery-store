import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { PrintButton } from '@/components/admin/PrintButton';
import { formatAgorot, formatDateTime } from '@/lib/admin/format';
import { getOrderForAdmin, ORDER_STATUS_LABELS } from '@/lib/admin/orders';
import { getAdminUser, requireAdminPage } from '@/lib/admin/session';
import { SITE_NAME } from '@/lib/config/site';
import { prisma } from '@/lib/db';
import { notFoundMetadata } from '@/lib/seo/not-found';

type Params = Promise<{ number: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  // Nothing about an order - not even that it exists - before sign-in.
  if (!(await getAdminUser())) return { title: 'ניהול' };
  const { number } = await params;
  const order = /^\d{1,9}$/.test(number)
    ? await prisma.order.findUnique({
        where: { orderNumber: Number(number) },
        select: { id: true },
      })
    : null;
  return order ? { title: `דף עבודה ${number}` } : notFoundMetadata;
}

/**
 * The order on one sheet of paper: a job card for the bench (every
 * engraving and size spelled out large) and a packing slip for the parcel.
 * The admin's header and this page's button are hidden when printed.
 */
export default async function PrintOrderPage({ params }: { params: Params }) {
  await requireAdminPage();
  const { number } = await params;
  const order = /^\d{1,9}$/.test(number) ? await getOrderForAdmin(Number(number)) : null;
  if (!order) notFound();
  const address = order.addresses.find((entry) => entry.type === 'SHIPPING');

  return (
    <article className="mx-auto max-w-3xl text-base print:max-w-none print:text-[12pt]">
      <div className="mb-6 flex items-center justify-between gap-4 print:hidden">
        <p className="text-muted-foreground text-sm">בודקים שהכול נכון ולוחצים להדפסה.</p>
        <PrintButton />
      </div>

      <header className="border-foreground flex items-start justify-between gap-6 border-b-2 pb-4">
        <div>
          <p className="text-sm">
            <bdi>{SITE_NAME}</bdi>
          </p>
          <h1 className="text-3xl font-bold">הזמנה {order.orderNumber}</h1>
          <p className="mt-1 text-sm">
            {formatDateTime(order.placedAt)} · {ORDER_STATUS_LABELS[order.status]}
          </p>
        </div>
        <div className="text-end text-sm">
          <p className="font-bold">{order.customerName}</p>
          <p>
            <bdi dir="ltr">{order.phone}</bdi>
          </p>
          <p>
            <bdi dir="ltr">{order.email}</bdi>
          </p>
        </div>
      </header>

      <section className="mt-6">
        <h2 className="text-lg font-bold">לעבודה</h2>
        <ol className="mt-3 space-y-4">
          {order.lines.map((line, index) => (
            <li key={line.id} className="border-foreground/40 break-inside-avoid border p-4">
              <p className="text-lg font-bold">
                {index + 1}. {line.productNameHe}
                {line.quantity > 1 && <span> × {line.quantity}</span>}
              </p>
              <p>{line.variantLabelHe}</p>
              {line.details.length > 0 && (
                <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                  {line.details.map((detail) => (
                    <div key={`${detail.label}-${detail.value}`} className="contents">
                      <dt>{detail.label}:</dt>
                      <dd className="text-lg font-bold">{detail.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
              <p className="mt-2 text-sm">
                מק״ט <bdi dir="ltr">{line.sku}</bdi>
                {line.prepDays ? ` · זמן הכנה ${line.prepDays} ימי עסקים` : ''}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {order.notesInternal && (
        <section className="mt-6 break-inside-avoid">
          <h2 className="text-lg font-bold">הערות</h2>
          <p className="mt-2 whitespace-pre-line">{order.notesInternal}</p>
        </section>
      )}

      {address && (
        <section className="border-foreground mt-8 break-inside-avoid border-2 border-dashed p-5">
          <h2 className="text-sm">משלוח אל</h2>
          <p className="mt-1 text-2xl font-bold">{address.fullName}</p>
          <p className="text-xl">
            {address.street} {address.houseNumber}
            {address.apartment ? `, דירה ${address.apartment}` : ''}
          </p>
          <p className="text-xl">
            {address.city}
            {address.postalCode ? ` ${address.postalCode}` : ''}
          </p>
          <p className="mt-1 text-lg">
            <bdi dir="ltr">{address.phone}</bdi>
          </p>
          {address.instructions && <p className="mt-2">הערות למשלוח: {address.instructions}</p>}
          <p className="mt-3 text-sm">
            הזמנה {order.orderNumber} · {order.lines.reduce((sum, line) => sum + line.quantity, 0)}{' '}
            פריטים · סה״כ {formatAgorot(order.totalAgorot)}
          </p>
        </section>
      )}
    </article>
  );
}
