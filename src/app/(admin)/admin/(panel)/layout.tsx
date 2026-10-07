import type { Metadata } from 'next';
import Link from 'next/link';

import { AdminNav } from '@/components/admin/AdminNav';
import { signOutAction } from '@/lib/admin/actions';
import { requireAdminPage } from '@/lib/admin/session';
import { SITE_NAME } from '@/lib/config/site';

export const metadata: Metadata = {
  title: { default: 'ניהול', template: '%s | ניהול' },
  robots: { index: false, follow: false },
};

/** Always fresh, never cached (ARCHITECTURE 13). */
export const dynamic = 'force-dynamic';

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdminPage();

  return (
    <div className="min-h-dvh">
      <header className="border-border border-b">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/admin/orders" className="text-sm font-bold">
            <bdi>{SITE_NAME}</bdi> · ניהול
          </Link>
          <AdminNav />
          <div className="ms-auto flex items-center gap-4 text-sm">
            <Link href="/" className="text-muted-foreground hover:text-foreground">
              לאתר
            </Link>
            <Link href="/admin/account" className="text-muted-foreground hover:text-foreground">
              {user.name}
            </Link>
            <form action={signOutAction}>
              <button type="submit" className="text-muted-foreground hover:text-foreground">
                יציאה
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
