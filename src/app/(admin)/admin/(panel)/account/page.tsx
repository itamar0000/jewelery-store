import type { Metadata } from 'next';

import { PasswordForm } from '@/components/admin/PasswordForm';
import { requireAdminPage } from '@/lib/admin/session';

export const metadata: Metadata = { title: 'החשבון שלי' };

export default async function AdminAccountPage() {
  const user = await requireAdminPage();
  return (
    <div className="max-w-sm">
      <h1 className="text-2xl font-bold">החשבון שלי</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        {user.name} · <bdi dir="ltr">{user.email}</bdi>
      </p>
      <h2 className="mt-8 text-lg font-bold">החלפת סיסמה</h2>
      <PasswordForm />
    </div>
  );
}
