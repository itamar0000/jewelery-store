import type { Metadata } from 'next';

import { PlaceholderPage } from '@/components/layout/PlaceholderPage';

export const metadata: Metadata = { title: 'החשבון שלי' };

export default function AccountPage() {
  return (
    <PlaceholderPage
      title="החשבון שלי"
      explanation="עדיין אין הרשמה או התחברות באתר. לא נאספים כאן פרטים אישיים."
      phase="ייבנה בשלב 6 — הזדהות וחשבון לקוח."
    />
  );
}
