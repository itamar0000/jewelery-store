'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/components/ui/cn';

const SECTIONS = [
  { href: '/admin/orders', label: 'הזמנות' },
  { href: '/admin/requests', label: 'בקשות עיצוב' },
  { href: '/admin/products', label: 'מוצרים' },
  { href: '/admin/promotions', label: 'מבצעים' },
  { href: '/admin/coupons', label: 'קופונים' },
  { href: '/admin/announcements', label: 'הודעות' },
  { href: '/admin/help', label: 'עזרה' },
] as const;

/**
 * The admin's sections. One row that scrolls sideways on a phone rather than
 * wrapping into a block, and a count beside a section when something in it
 * waits for a hand.
 */
export function AdminNav({ badges = {} }: { badges?: Partial<Record<string, number>> }) {
  const pathname = usePathname();
  return (
    <nav aria-label="ניהול" className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-2">
      {SECTIONS.map((section) => {
        const current = pathname === section.href || pathname.startsWith(`${section.href}/`);
        const badge = badges[section.href] ?? 0;
        return (
          <Link
            key={section.href}
            href={section.href}
            aria-current={current ? 'page' : undefined}
            className={cn(
              'inline-flex min-h-11 shrink-0 items-center gap-2 px-3 text-[0.9375rem] font-medium whitespace-nowrap transition-colors',
              current ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {section.label}
            {badge > 0 && (
              <span className="bg-stamp text-stamp-foreground inline-flex min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-bold tabular-nums">
                {badge}
                <span className="sr-only"> ממתינות</span>
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
