import type { Metadata } from 'next';
import Link from 'next/link';

import { StatusPill } from '@/components/admin/StatusTabs';
import { formatAgorot, formatDate } from '@/lib/admin/format';
import { WINDOW_STATUS_LABELS, windowStatus } from '@/lib/admin/discounts';
import { requireAdminPage } from '@/lib/admin/session';
import { prisma } from '@/lib/db';

export const metadata: Metadata = { title: 'קופונים' };

const TONE = { live: 'done', scheduled: 'attention', ended: 'off', off: 'off' } as const;

export default async function CouponsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  await requireAdminPage();
  const { saved } = await searchParams;
  const coupons = await prisma.coupon.findMany({
    where: { archivedAt: null },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { redemptions: true } },
      redemptions: { select: { amountAgorot: true } },
    },
  });

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">קופונים</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            קוד שהלקוח מקליד בסל: על כל ההזמנה, או על דגמים, קטגוריות ואוספים.
          </p>
        </div>
        <Link
          href="/admin/coupons/new"
          className="bg-stamp text-stamp-foreground hover:bg-stamp-hover inline-flex h-10 items-center rounded-full px-5 text-sm font-semibold"
        >
          קופון חדש
        </Link>
      </div>
      {saved && (
        <p role="status" className="text-success mt-4 text-sm">
          הקופון נשמר.
        </p>
      )}

      {coupons.length === 0 ? (
        <p className="text-muted-foreground mt-10">אין קופונים עדיין.</p>
      ) : (
        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="border-border text-muted-foreground border-b">
              <th className="py-2 pe-4 text-start font-medium">קוד</th>
              <th className="py-2 pe-4 text-start font-medium">הנחה</th>
              <th className="py-2 pe-4 text-start font-medium">תאריכים</th>
              <th className="py-2 pe-4 text-start font-medium">שימושים</th>
              <th className="py-2 text-start font-medium">מצב</th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((coupon) => {
              const status = windowStatus(coupon);
              const given = coupon.redemptions.reduce((sum, row) => sum + row.amountAgorot, 0);
              return (
                <tr key={coupon.id} className="border-border hover:bg-muted/50 border-b">
                  <td className="py-3 pe-4">
                    <Link
                      href={`/admin/coupons/${coupon.id}`}
                      className="font-semibold underline-offset-4 hover:underline"
                    >
                      <bdi dir="ltr">{coupon.code}</bdi>
                    </Link>
                    {coupon.descriptionHe && (
                      <div className="text-muted-foreground text-xs">{coupon.descriptionHe}</div>
                    )}
                  </td>
                  <td className="py-3 pe-4 tabular-nums">
                    {coupon.discountType === 'PERCENTAGE'
                      ? `${coupon.discountValue / 100}%`
                      : formatAgorot(coupon.discountValue)}
                  </td>
                  <td className="py-3 pe-4 tabular-nums">
                    {coupon.startsAt ? formatDate(coupon.startsAt) : 'מעכשיו'} –{' '}
                    {coupon.endsAt ? formatDate(coupon.endsAt) : 'ללא סוף'}
                  </td>
                  <td className="py-3 pe-4 tabular-nums">
                    {coupon._count.redemptions}
                    {coupon.usageLimitTotal ? ` מתוך ${coupon.usageLimitTotal}` : ''}
                    {given > 0 && (
                      <div className="text-muted-foreground text-xs">
                        סה״כ הנחה {formatAgorot(given)}
                      </div>
                    )}
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
