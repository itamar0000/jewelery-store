import Link from 'next/link';

import { ChevronIcon } from '@/components/ui/icons';

/**
 * Breadcrumb trail. MASTER_SPECIFICATION section 9 item 1.
 *
 * `<nav aria-label>` plus an ordered list, because the order is the meaning.
 * The final crumb is the current page: it is not a link, and it carries
 * `aria-current="page"` so assistive technology can say so.
 *
 * The separator is decorative and `aria-hidden` - a screen reader announcing
 * "chevron" between every crumb is noise. It uses `icon-directional`, so it
 * points along the reading direction and mirrors correctly in RTL
 * (ARCHITECTURE section 3.2).
 */
export interface Crumb {
  readonly label: string;
  /** Omitted on the last crumb, which is the current page. */
  readonly href?: string;
}

export function Breadcrumbs({ trail }: { trail: readonly Crumb[] }) {
  return (
    <nav aria-label="מסלול ניווט">
      <ol className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-xs">
        {trail.map((crumb, index) => {
          const last = index === trail.length - 1;

          return (
            <li key={crumb.label} className="flex items-center gap-1.5">
              {crumb.href && !last ? (
                <Link href={crumb.href} className="hover:text-foreground transition-colors">
                  {crumb.label}
                </Link>
              ) : (
                <span aria-current={last ? 'page' : undefined} className="text-foreground">
                  {crumb.label}
                </span>
              )}

              {!last && <ChevronIcon aria-hidden="true" className="icon-directional size-3" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
