import type { Metadata } from 'next';

import { PlaceholderPage } from '@/components/layout/PlaceholderPage';

export const metadata: Metadata = { title: 'מועדפים' };

export default function WishlistPage() {
  return (
    <PlaceholderPage
      title="מועדפים"
      explanation="רשימת המועדפים עדיין לא נשמרת. סימון לב בכרטיס מוצר אינו נשמר בין דפים."
      phase="ייבנה בשלב 6 — חשבון לקוח ופריטים שמורים."
    />
  );
}
