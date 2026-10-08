import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { AnnouncementForm } from '@/components/admin/DiscountForms';
import { getAdminUser, requireAdminPage } from '@/lib/admin/session';
import { prisma } from '@/lib/db';
import { notFoundMetadata } from '@/lib/seo/not-found';

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  if (!(await getAdminUser())) return { title: 'ניהול' };
  const { id } = await params;
  const found = await prisma.announcement.findUnique({ where: { id }, select: { id: true } });
  return found ? { title: 'עריכת הודעה' } : notFoundMetadata;
}

export default async function EditAnnouncementPage({ params }: { params: Params }) {
  await requireAdminPage();
  const { id } = await params;
  const announcement = await prisma.announcement.findUnique({ where: { id } });
  if (!announcement) notFound();
  return (
    <>
      <Link href="/admin/announcements" className="text-muted-foreground text-sm hover:underline">
        → כל ההודעות
      </Link>
      <h1 className="mt-3 text-2xl font-bold">עריכת הודעה</h1>
      <AnnouncementForm announcement={announcement} />
    </>
  );
}
