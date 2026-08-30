import type { Metadata } from 'next';

import { PlaceholderPage } from '@/components/layout/PlaceholderPage';

export const metadata: Metadata = { title: 'סל הקניות' };

export default function CartPage() {
  return (
    <PlaceholderPage
      title="סל הקניות"
      explanation="הסל עדיין לא פעיל. אי אפשר להוסיף מוצרים, ולא נשמרים כאן נתונים."
      phase="ייבנה בשלב 5 — סל ותשלום."
    />
  );
}
