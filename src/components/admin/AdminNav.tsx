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
] as const;

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="ניהול" className="flex gap-1">
      {SECTIONS.map((section) => {
        const current = pathname === section.href || pathname.startsWith(`${section.href}/`);
        return (
          <Link
            key={section.href}
            href={section.href}
            aria-current={current ? 'page' : undefined}
            className={cn(
              'px-3 py-2 text-sm font-medium transition-colors',
              current ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {section.label}
          </Link>
        );
      })}
    </nav>
  );
}
