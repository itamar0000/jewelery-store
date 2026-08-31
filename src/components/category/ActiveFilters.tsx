import Link from 'next/link';

import { CloseIcon } from '@/components/ui/icons';
import {
  FACET_CODES,
  buildCatalogHref,
  hasActiveFilters,
  type CatalogQuery,
  type Facet,
} from '@/lib/catalog/filters';

/**
 * The active-filter chips, with a clear-all link.
 *
 * Two jobs. It makes the active filters visible without opening the panel -
 * otherwise a visitor arriving on a shared filtered URL sees a short result
 * list with no explanation - and it gives the one-click escape the empty state
 * needs, so nobody has to edit the address bar to recover.
 *
 * Renders nothing when no filter is active, rather than an empty row.
 */
export function ActiveFilters({
  facets,
  query,
  basePath,
}: {
  facets: readonly Facet[];
  query: CatalogQuery;
  basePath: string;
}) {
  if (!hasActiveFilters(query)) return null;

  const chips: { key: string; label: string; href: string }[] = [];

  for (const code of FACET_CODES) {
    const facet = facets.find((entry) => entry.code === code);
    if (!facet) continue;

    for (const value of query.values[code]) {
      const match = facet.values.find((entry) => entry.value === value);
      if (!match) continue;

      chips.push({
        key: `${code}:${value}`,
        label: `${facet.labelHe}: ${match.labelHe}`,
        href: buildCatalogHref(basePath, query, { toggle: { code, token: match.token } }, [facet]),
      });
    }
  }

  if (query.minPrice !== null || query.maxPrice !== null) {
    const from = query.minPrice !== null ? `${query.minPrice} ₪` : '';
    const to = query.maxPrice !== null ? `${query.maxPrice} ₪` : '';

    chips.push({
      key: 'price',
      label: `מחיר: ${from || 'ללא מינימום'} – ${to || 'ללא מקסימום'}`,
      href: buildCatalogHref(basePath, query, { minPrice: null, maxPrice: null }),
    });
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <h2 className="sr-only">סינון פעיל</h2>

      {chips.map((chip) => (
        <Link
          key={chip.key}
          href={chip.href}
          scroll={false}
          className="border-border-strong hover:bg-muted inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors"
        >
          {chip.label}
          <CloseIcon aria-hidden="true" className="size-3" />
          <span className="sr-only">, הסרת הסינון</span>
        </Link>
      ))}

      <Link
        href={buildCatalogHref(basePath, query, { clearAll: true, sort: query.sort })}
        scroll={false}
        className="text-accent px-2 py-1 text-xs underline underline-offset-4"
      >
        נקה סינון
      </Link>
    </div>
  );
}
