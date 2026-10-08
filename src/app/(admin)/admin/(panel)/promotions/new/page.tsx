import type { Metadata } from 'next';
import Link from 'next/link';

import { PromotionForm } from '@/components/admin/DiscountForms';
import { loadTargetChoices } from '@/lib/admin/discounts';
import { requireAdminPage } from '@/lib/admin/session';

export const metadata: Metadata = { title: 'מבצע חדש' };

export default async function NewPromotionPage() {
  await requireAdminPage();
  const choices = await loadTargetChoices();
  return (
    <>
      <Link href="/admin/promotions" className="text-muted-foreground text-sm hover:underline">
        → כל המבצעים
      </Link>
      <h1 className="mt-3 text-2xl font-bold">מבצע חדש</h1>
      <PromotionForm promotion={null} choices={choices} />
    </>
  );
}
