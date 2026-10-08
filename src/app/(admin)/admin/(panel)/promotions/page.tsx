import type { Metadata } from 'next';
import Link from 'next/link';

import { StatusPill } from '@/components/admin/StatusTabs';
import { formatAgorot, formatDate } from '@/lib/admin/format';
import { WINDOW_STATUS_LABELS, windowStatus } from '@/lib/admin/discounts';
import { requireAdminPage } from '@/lib/admin/session';
import { prisma } from '@/lib/db';

export const metadata: Metadata = { title: 'מבצעים' };

const SCOPE_HE: Record<string, string> = {
  ENTIRE_SITE: 'כל האתר',
  CATEGORY: 'קטגוריות',
  COLLECTION: 'אוספים',
  PRODUCT: 'דגמים',
};

const TONE = { live: 'done', scheduled: 'attention', ended: 'off', off: 'off' } as const;

export default async function PromotionsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  await requireAdminPage();
  const { saved } = await searchParams;
  const promotions = await prisma.promotion.findMany({
    where: { archivedAt: null },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { targets: true } } },
  });

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">מבצעים</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            הנחה אוטומטית לפי תאריכים, בלי קוד: על דגם, קטגוריה, אוסף או כל האתר.
          </p>
        </div>
        <Link
          href="/admin/promotions/new"
          className="bg-stamp text-stamp-foreground hover:bg-stamp-hover inline-flex h-10 items-center rounded-full px-5 text-sm font-semibold"
        >
          מבצע חדש
        </Link>
      </div>
      {saved && (
        <p role="status" className="text-success mt-4 text-sm">
          המבצע נשמר.
        </p>
      )}

      {promotions.length === 0 ? (
        <p className="text-muted-foreground mt-10">אין מבצעים עדיין.</p>
      ) : (
        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="border-border text-muted-foreground border-b">
              <th className="py-2 pe-4 text-start font-medium">מבצע</th>
              <th className="py-2 pe-4 text-start font-medium">הנחה</th>
              <th className="py-2 pe-4 text-start font-medium">על מה</th>
              <th className="py-2 pe-4 text-start font-medium">תאריכים</th>
              <th className="py-2 text-start font-medium">מצב</th>
            </tr>
          </thead>
          <tbody>
            {promotions.map((promotion) => {
              const status = windowStatus(promotion);
              return (
                <tr key={promotion.id} className="border-border hover:bg-muted/50 border-b">
                  <td className="py-3 pe-4">
                    <Link
                      href={`/admin/promotions/${promotion.id}`}
                      className="font-semibold underline-offset-4 hover:underline"
                    >
                      {promotion.nameHe}
                    </Link>
                  </td>
                  <td className="py-3 pe-4 tabular-nums">
                    {promotion.discountType === 'PERCENTAGE'
                      ? `${promotion.discountValue / 100}%`
                      : formatAgorot(promotion.discountValue)}
                  </td>
                  <td className="py-3 pe-4">
                    {SCOPE_HE[promotion.appliesTo]}
                    {promotion.appliesTo !== 'ENTIRE_SITE' && ` (${promotion._count.targets})`}
                  </td>
                  <td className="py-3 pe-4 tabular-nums">
                    {promotion.startsAt ? formatDate(promotion.startsAt) : 'מעכשיו'} –{' '}
                    {promotion.endsAt ? formatDate(promotion.endsAt) : 'ללא סוף'}
                  </td>
                  <td className="py-3">
                    <StatusPill label={WINDOW_STATUS_LABELS[status]} tone={TONE[status]} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
}
