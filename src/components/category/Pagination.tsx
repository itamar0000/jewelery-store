import Link from 'next/link';

import { cn } from '@/components/ui/cn';
import { ChevronIcon } from '@/components/ui/icons';
import { buildCatalogHref, type CatalogQuery } from '@/lib/catalog/filters';

/**
 * Page navigation.
 *
 * REAL LINKS, so each page is a genuine URL: shareable, bookmarkable, indexable
 * and correct under back/forward without any client state. `?page=1` is never
 * emitted - `buildCatalogHref` omits defaults - so page one has exactly one
 * URL rather than two that differ only in a redundant parameter.
 *
 * RENDERS NOTHING WHEN THERE IS ONE PAGE. A lone disabled "1" is noise.
 *
 * The number list is windowed around the current page with first and last
 * always present, so a hundred pages do not produce a hundred links. Gaps are
 * an ellipsis carrying `aria-hidden`, because "…" announced between numbers
 * tells a screen-reader user nothing.
 *
 * Chevrons use `icon-directional`: previous and next are reading-order
 * concepts, so they mirror in RTL (ARCHITECTURE section 3.2).
 */
export function Pagination({
  query,
  basePath,
  page,
  totalPages,
}: {
  query: CatalogQuery;
  basePath: string;
  page: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;

  const href = (target: number) => buildCatalogHref(basePath, query, { page: target });

  return (
    <nav aria-label="ניווט בין עמודים" className="mt-12 flex justify-center">
      <ul className="flex items-center gap-1">
        <li>
          {page > 1 ? (
            <Link href={href(page - 1)} scroll={false} className={stepClass}>
              <ChevronIcon aria-hidden="true" className="icon-directional size-4 rotate-180" />
              <span className="sr-only">לעמוד הקודם</span>
            </Link>
          ) : (
            <span aria-hidden="true" className={cn(stepClass, 'opacity-30')}>
              <ChevronIcon className="icon-directional size-4 rotate-180" />
            </span>
          )}
        </li>

        {pageWindow(page, totalPages).map((entry, index) =>
          entry === null ? (
            <li key={`gap-${index}`} aria-hidden="true" className="text-muted-foreground px-2">
              …
            </li>
          ) : (
            <li key={entry}>
              <Link
                href={href(entry)}
                scroll={false}
                aria-current={entry === page ? 'page' : undefined}
                className={cn(
                  'inline-flex size-10 items-center justify-center rounded-sm border text-sm transition-colors',
                  entry === page
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border hover:border-border-strong hover:bg-muted',
                )}
              >
                {entry}
                {entry === page && <span className="sr-only">, העמוד הנוכחי</span>}
              </Link>
            </li>
          ),
        )}

        <li>
          {page < totalPages ? (
            <Link href={href(page + 1)} scroll={false} className={stepClass}>
              <ChevronIcon aria-hidden="true" className="icon-directional size-4" />
              <span className="sr-only">לעמוד הבא</span>
            </Link>
          ) : (
            <span aria-hidden="true" className={cn(stepClass, 'opacity-30')}>
              <ChevronIcon className="icon-directional size-4" />
            </span>
          )}
        </li>
      </ul>
    </nav>
  );
}

const stepClass =
  'border-border hover:border-border-strong hover:bg-muted inline-flex size-10 items-center justify-center rounded-sm border transition-colors';

/**
 * First page, last page, and a window around the current one. `null` is a gap.
 *
 * Kept as a pure function so the windowing is obvious and testable rather than
 * buried in JSX.
 */
export function pageWindow(page: number, totalPages: number): (number | null)[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, totalPages, page]);
  if (page - 1 > 1) pages.add(page - 1);
  if (page + 1 < totalPages) pages.add(page + 1);

  const sorted = [...pages].sort((a, b) => a - b);
  const output: (number | null)[] = [];

  for (const [index, value] of sorted.entries()) {
    const previous = sorted[index - 1];
    if (previous !== undefined && value - previous > 1) output.push(null);
    output.push(value);
  }

  return output;
}
