import type { Metadata } from 'next';
import Link from 'next/link';

import { StatusPill } from '@/components/admin/StatusTabs';
import { formatDate } from '@/lib/admin/format';
import { WINDOW_STATUS_LABELS, windowStatus } from '@/lib/admin/discounts';
import { requireAdminPage } from '@/lib/admin/session';
import { prisma } from '@/lib/db';

export const metadata: Metadata = { title: 'הודעות באתר' };

const TONE = { live: 'done', scheduled: 'attention', ended: 'off', off: 'off' } as const;

export default async function AnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  await requireAdminPage();
  const { saved } = await searchParams;
  const announcements = await prisma.announcement.findMany({ orderBy: { createdAt: 'desc' } });

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">הודעות באתר</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            פס הודעה מעל הכותרת של האתר, למשל על מבצע. מוצגת הודעה אחת בכל זמן: החדשה ביותר מבין
            הפעילות.
          </p>
        </div>
        <Link
          href="/admin/announcements/new"
          className="bg-stamp text-stamp-foreground hover:bg-stamp-hover inline-flex h-10 items-center rounded-full px-5 text-sm font-semibold"
        >
          הודעה חדשה
        </Link>
      </div>
      {saved && (
        <p role="status" className="text-success mt-4 text-sm">
          ההודעה נשמרה.
        </p>
      )}

      {announcements.length === 0 ? (
        <p className="text-muted-foreground mt-10">אין הודעות עדיין.</p>
      ) : (
        <ul className="divide-border border-border mt-6 divide-y border-y">
          {announcements.map((announcement) => {
            const status = windowStatus(announcement);
            return (
              <li key={announcement.id}>
                <Link
                  href={`/admin/announcements/${announcement.id}`}
                  className="hover:bg-muted/50 flex flex-wrap items-center gap-x-6 gap-y-1 px-1 py-4 text-sm"
                >
                  <span className="min-w-0 flex-1 font-medium">{announcement.textHe}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {announcement.startsAt ? formatDate(announcement.startsAt) : 'מעכשיו'} –{' '}
                    {announcement.endsAt ? formatDate(announcement.endsAt) : 'ללא סוף'}
                  </span>
                  <StatusPill label={WINDOW_STATUS_LABELS[status]} tone={TONE[status]} />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
