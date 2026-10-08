import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { PromotionForm } from '@/components/admin/DiscountForms';
import { loadTargetChoices } from '@/lib/admin/discounts';
import { getAdminUser, requireAdminPage } from '@/lib/admin/session';
import { prisma } from '@/lib/db';
import { notFoundMetadata } from '@/lib/seo/not-found';

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  if (!(await getAdminUser())) return { title: 'ניהול' };
  const { id } = await params;
  const promotion = await prisma.promotion.findUnique({ where: { id }, select: { nameHe: true } });
  return promotion ? { title: promotion.nameHe } : notFoundMetadata;
}

export default async function EditPromotionPage({ params }: { params: Params }) {
  await requireAdminPage();
  const { id } = await params;
  const [promotion, choices] = await Promise.all([
    prisma.promotion.findFirst({ where: { id, archivedAt: null }, include: { targets: true } }),
    loadTargetChoices(),
  ]);
  if (!promotion) notFound();
  return (
    <>
      <Link href="/admin/promotions" className="text-muted-foreground text-sm hover:underline">
        → כל המבצעים
      </Link>
      <h1 className="mt-3 text-2xl font-bold">{promotion.nameHe}</h1>
      <PromotionForm promotion={promotion} choices={choices} />
    </>
  );
}
