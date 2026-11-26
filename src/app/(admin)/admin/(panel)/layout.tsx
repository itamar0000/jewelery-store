import type { Metadata } from 'next';
import Link from 'next/link';

import { AdminNav } from '@/components/admin/AdminNav';
import { signOutAction } from '@/lib/admin/actions';
import { openStatuses } from '@/lib/admin/orders';
import { requireAdminPage } from '@/lib/admin/session';
import { SITE_NAME } from '@/lib/config/site';
import { prisma } from '@/lib/db';
import { getPaymentProvider } from '@/lib/payments/provider';

export const metadata: Metadata = {
  title: { default: 'ניהול', template: '%s | ניהול' },
  robots: { index: false, follow: false },
};

/** Always fresh, never cached (ARCHITECTURE 13). */
export const dynamic = 'force-dynamic';

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdminPage();

  // What waits for a hand, shown as a number on the menu so it is seen from
  // any page: orders in the "לטיפול" list, and requests nobody has opened.
  const [ordersWaiting, requestsWaiting] = await Promise.all([
    prisma.order.count({ where: { status: { in: openStatuses(!getPaymentProvider()) } } }),
    prisma.customRequest.count({ where: { status: 'NEW' } }),
  ]);

  return (
    <div className="min-h-dvh">
      <header className="border-border border-b print:hidden">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-3 pb-1">
            <Link href="/admin/orders" className="text-sm font-bold">
              <bdi>{SITE_NAME}</bdi> · ניהול
            </Link>
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
          <AdminNav
            badges={{ '/admin/orders': ordersWaiting, '/admin/requests': requestsWaiting }}
          />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8 print:max-w-none print:p-0">
        {children}
      </main>
    </div>
  );
}
