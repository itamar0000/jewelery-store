import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { AdminCouponForm } from '@/components/admin/DiscountForms';
import { loadTargetChoices } from '@/lib/admin/discounts';
import { getAdminUser, requireAdminPage } from '@/lib/admin/session';
import { prisma } from '@/lib/db';
import { notFoundMetadata } from '@/lib/seo/not-found';

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  if (!(await getAdminUser())) return { title: 'ניהול' };
  const { id } = await params;
  const coupon = await prisma.coupon.findUnique({ where: { id }, select: { code: true } });
  return coupon ? { title: `קופון ${coupon.code}` } : notFoundMetadata;
}

export default async function EditCouponPage({ params }: { params: Params }) {
  await requireAdminPage();
  const { id } = await params;
  const [coupon, choices] = await Promise.all([
    prisma.coupon.findFirst({ where: { id, archivedAt: null }, include: { targets: true } }),
    loadTargetChoices(),
  ]);
  if (!coupon) notFound();
  return (
    <>
      <Link href="/admin/coupons" className="text-muted-foreground text-sm hover:underline">
        → כל הקופונים
      </Link>
      <h1 className="mt-3 text-2xl font-bold">
        קופון <bdi dir="ltr">{coupon.code}</bdi>
      </h1>
      <AdminCouponForm coupon={coupon} choices={choices} />
    </>
  );
}
