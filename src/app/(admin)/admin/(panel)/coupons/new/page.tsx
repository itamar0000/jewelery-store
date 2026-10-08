import type { Metadata } from 'next';
import Link from 'next/link';

import { AdminCouponForm } from '@/components/admin/DiscountForms';
import { loadTargetChoices } from '@/lib/admin/discounts';
import { requireAdminPage } from '@/lib/admin/session';

export const metadata: Metadata = { title: 'קופון חדש' };

export default async function NewCouponPage() {
  await requireAdminPage();
  const choices = await loadTargetChoices();
  return (
    <>
      <Link href="/admin/coupons" className="text-muted-foreground text-sm hover:underline">
        → כל הקופונים
      </Link>
      <h1 className="mt-3 text-2xl font-bold">קופון חדש</h1>
      <AdminCouponForm coupon={null} choices={choices} />
    </>
  );
}
