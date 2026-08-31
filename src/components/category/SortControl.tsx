'use client';

import { useRouter } from 'next/navigation';
import { useId } from 'react';

import {
  SORT_KEYS,
  SORT_LABELS,
  buildCatalogHref,
  type CatalogQuery,
  type SortKey,
} from '@/lib/catalog/filters';

/**
 * Sort control.
 *
 * URL-DRIVEN, like the filters: changing the selection navigates to the URL
 * that represents the new order, and the ordering itself happens in PostgreSQL
 * (`buildCatalogOrderBy`). Nothing is sorted in JavaScript, and no sort state
 * is held in a component - the `value` is read from the parsed query, so back
 * and forward move the select as well as the results.
 *
 * Changing the sort resets to page 1, which `buildCatalogHref` does by default.
 * Staying on page 4 while the order changes shows an arbitrary slice of a
 * differently-ordered list.
 *
 * A NATIVE <select>. A custom listbox would need roving focus, type-ahead and
 * its own screen-reader story, and would still be worse on a phone than the
 * platform picker.
 */
export function SortControl({ query, basePath }: { query: CatalogQuery; basePath: string }) {
  const router = useRouter();
  const id = useId();

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="sr-only">
        מיון מוצרים
      </label>

      <select
        id={id}
        value={query.sort}
        onChange={(event) =>
          router.push(buildCatalogHref(basePath, query, { sort: event.target.value as SortKey }), {
            scroll: false,
          })
        }
        className="border-border-strong focus:border-accent h-11 rounded-sm border bg-transparent px-3 text-sm outline-none"
      >
        {SORT_KEYS.map((key) => (
          <option key={key} value={key}>
            {SORT_LABELS[key]}
          </option>
        ))}
      </select>
    </div>
  );
}
