import Link from 'next/link';

import { cn } from '@/components/ui/cn';

/** Filter tabs over a list, each with its count. Links, so a filter is a URL. */
export function StatusTabs({
  basePath,
  current,
  tabs,
  counts,
  extraParams,
}: {
  basePath: string;
  current: string;
  tabs: readonly { value: string; label: string }[];
  counts: Record<string, number>;
  extraParams?: Record<string, string>;
}) {
  return (
    <nav aria-label="סינון לפי סטטוס" className="flex flex-wrap gap-1">
      {tabs.map((tab) => {
        const params = new URLSearchParams(extraParams);
        if (tab.value !== 'OPEN') params.set('status', tab.value);
        const query = params.toString();
        const active = tab.value === current;
        const count = counts[tab.value] ?? 0;
        return (
          <Link
            key={tab.value}
            href={query ? `${basePath}?${query}` : basePath}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'border px-3 py-1.5 text-sm transition-colors',
              active
                ? 'border-foreground bg-foreground text-background'
                : 'border-border hover:border-border-strong',
            )}
          >
            {tab.label}
            <span className={cn('ms-1.5 tabular-nums', !active && 'text-muted-foreground')}>
              {count}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

export function StatusPill({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'attention' | 'done' | 'off';
}) {
  return (
    <span
      className={cn(
        'inline-block border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        tone === 'attention' && 'border-warning/40 text-warning',
        tone === 'done' && 'border-success/40 text-success',
        tone === 'off' && 'border-border text-muted-foreground',
        tone === 'neutral' && 'border-border-strong',
      )}
    >
      {label}
    </span>
  );
}
