import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { LoginForm } from '@/components/admin/LoginForm';
import { getAdminUser } from '@/lib/admin/session';
import { SITE_NAME } from '@/lib/config/site';

export const metadata: Metadata = {
  title: 'כניסה לניהול',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function AdminLoginPage() {
  if (await getAdminUser()) redirect('/admin/orders');

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-16">
      <div className="border-border w-full max-w-sm border p-8">
        <p className="text-muted-foreground text-sm">
          <bdi>{SITE_NAME}</bdi>
        </p>
        <h1 className="mt-1 text-2xl font-bold">כניסה לניהול</h1>
        <LoginForm />
      </div>
    </main>
  );
}
