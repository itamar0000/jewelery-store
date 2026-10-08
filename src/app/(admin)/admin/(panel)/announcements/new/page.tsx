import type { Metadata } from 'next';
import Link from 'next/link';

import { AnnouncementForm } from '@/components/admin/DiscountForms';
import { requireAdminPage } from '@/lib/admin/session';

export const metadata: Metadata = { title: 'הודעה חדשה' };

export default async function NewAnnouncementPage() {
  await requireAdminPage();
  return (
    <>
      <Link href="/admin/announcements" className="text-muted-foreground text-sm hover:underline">
        → כל ההודעות
      </Link>
      <h1 className="mt-3 text-2xl font-bold">הודעה חדשה</h1>
      <AnnouncementForm announcement={null} />
    </>
  );
}
