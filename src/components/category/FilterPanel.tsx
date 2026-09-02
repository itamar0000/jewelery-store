'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';

import { cn } from '@/components/ui/cn';
import { CloseIcon, FilterIcon, MinusIcon, PlusIcon } from '@/components/ui/icons';
import {
  activeFilterCount,
  buildCatalogHref,
  type CatalogQuery,
  type Facet,
} from '@/lib/catalog/filters';

import { SortControl } from './SortControl';

/**
 * The category toolbar and the filter surface.
 *
 * THE URL IS THE STATE. Every value is a `<Link>` to the URL that results from
 * toggling it, computed by `buildCatalogHref`. There is no `useState` holding a
 * selection, no effect syncing state to the address bar, and no "apply"
 * button - so reload, back, forward and a pasted link all behave identically by
 * construction rather than by careful synchronisation.
 *
 * Values render as LINKS rather than checkboxes because navigating is what
 * actually happens. The checkbox square is decorative; the accessible name
 * carries the state and the action ("זהב לבן, הסרת הסינון"), which is
 * unambiguous in a screen reader and survives without JavaScript.
 *
 * FILTERS ARE OPT-IN, NOT PERMANENT FURNITURE - unchanged from 3A. Closed by
 * default, opening downward on desktop and as a side drawer on mobile, so the
 * product grid keeps the full page width. The only local state in this file is
 * whether that panel is open, which is presentation and belongs nowhere near
 * the URL.
 */
export function FilterBar({
  facets,
  query,
  basePath,
  productCount,
}: {
  facets: readonly Facet[];
  query: CatalogQuery;
  /** Category path without query string, e.g. `/rings`. */
  basePath: string;
  productCount: number;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const activeCount = activeFilterCount(query);

  return (
    <>
      <div className="border-border flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((value) => !value)}
            className={cn(
              'inline-flex h-11 items-center gap-2 rounded-sm border px-4 text-sm transition-colors',
              open || activeCount > 0
                ? 'border-foreground bg-foreground text-background'
                : 'border-border-strong hover:bg-muted',
            )}
          >
            <FilterIcon className="size-4" />
            סינון
            {activeCount > 0 && <span aria-hidden="true">({activeCount})</span>}
            {activeCount > 0 && <span className="sr-only">{activeCount} מסננים פעילים</span>}
          </button>

          {/*
           * Live, because the count changes on every filter navigation and a
           * screen-reader user needs to hear the result set change size.
           */}
          <p aria-live="polite" className="text-muted-foreground text-sm">
            {productCount} מוצרים
          </p>
        </div>

        <SortControl query={query} basePath={basePath} />
      </div>

      {/* Desktop: panel opens downward, above the grid. */}
      <div id={panelId} hidden={!open} className="border-border hidden border-b py-6 lg:block">
        <div className="grid gap-x-10 gap-y-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {facets.map((facet) => (
            <FilterGroup key={facet.code} facet={facet} query={query} basePath={basePath} />
          ))}
        </div>
      </div>

      {/* Mobile: side drawer. */}
      {open && (
        <div className="lg:hidden">
          <div
            aria-hidden="true"
            onClick={() => setOpen(false)}
            className="bg-foreground/25 fixed inset-0 z-40"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label="סינון מוצרים"
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault();
                setOpen(false);
              }
            }}
            className="bg-card fixed inset-y-0 end-0 z-50 flex w-[min(22rem,90vw)] flex-col"
          >
            <div className="border-border flex h-16 shrink-0 items-center justify-between border-b px-4">
              <span className="text-sm font-medium">סינון</span>
              <button
                type="button"
                autoFocus
                onClick={() => setOpen(false)}
                className="hover:bg-muted inline-flex size-10 items-center justify-center rounded-sm"
              >
                <CloseIcon className="size-5" />
                <span className="sr-only">סגירת הסינון</span>
              </button>
            </div>

            <div className="divide-border flex-1 divide-y overflow-y-auto overscroll-contain px-4">
              {facets.map((facet) => (
                <FilterGroup key={facet.code} facet={facet} query={query} basePath={basePath} />
              ))}
            </div>

            {/*
             * DRAWER FOOTER - reset and dismiss.
             *
             * The drawer previously ended at the last filter group, which left
             * two things with no home on a phone. There was no way to clear a
             * filter set except by unticking values one at a time, and no
             * obvious way back to the results except the small X in the corner
             * or a tap on the backdrop.
             *
             * There is deliberately NO "apply" here. Filtering is URL state and
             * every value navigates the moment it is tapped, so the results
             * behind the drawer are already correct; an Apply button would
             * imply a pending change that does not exist. The primary control
             * therefore says how many products are waiting and closes.
             *
             * Reset is a `Link` for the same reason every value is - it is a
             * navigation to the unfiltered URL, so it works with the back
             * button and can be opened in a new tab.
             */}
            <div className="border-border flex shrink-0 items-center gap-3 border-t p-4">
              {activeCount > 0 && (
                <Link
                  href={buildCatalogHref(basePath, query, { clearAll: true, sort: query.sort })}
                  scroll={false}
                  onClick={() => setOpen(false)}
                  className="text-muted-foreground hover:text-foreground shrink-0 text-sm underline underline-offset-4 transition-colors"
                >
                  נקה סינון
                </Link>
              )}

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="bg-foreground text-background hover:bg-foreground/90 inline-flex h-12 flex-1 items-center justify-center rounded-sm text-sm font-medium transition-colors"
              >
                הצגת {productCount} מוצרים
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function FilterGroup({
  facet,
  query,
  basePath,
}: {
  facet: Facet;
  query: CatalogQuery;
  basePath: string;
}) {
  // Groups with a selection open by default, so an active filter is never
  // hidden behind a collapsed heading after a reload.
  const hasSelection =
    facet.code === 'price'
      ? query.minPrice !== null || query.maxPrice !== null
      : query.values[facet.code].length > 0;

  const [open, setOpen] = useState(hasSelection || facet.code === 'price');
  const panelId = useId();

  return (
    <fieldset className="py-4">
      <legend className="sr-only">{facet.labelHe}</legend>

      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between text-start text-sm font-medium"
      >
        {facet.labelHe}
        {open ? (
          <MinusIcon className="text-muted-foreground size-4" />
        ) : (
          <PlusIcon className="text-muted-foreground size-4" />
        )}
      </button>

      {open && (
        <div id={panelId} className="mt-3">
          {facet.code === 'price' ? (
            <PriceFilter facet={facet} query={query} basePath={basePath} />
          ) : (
            <ul className={cn(facet.code === 'gold_color' ? 'flex flex-wrap gap-3' : 'space-y-2')}>
              {facet.values.map((value) => {
                const active = query.values[facet.code].includes(value.value);
                const href = buildCatalogHref(
                  basePath,
                  query,
                  { toggle: { code: facet.code, token: value.token } },
                  [facet],
                );

                return (
                  <li key={value.value}>
                    <Link
                      href={href}
                      scroll={false}
                      className="group flex items-center gap-2 text-sm"
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          'flex size-4 shrink-0 items-center justify-center rounded-xs border',
                          active
                            ? 'border-foreground bg-foreground text-background'
                            : 'border-border-strong group-hover:border-foreground',
                        )}
                      >
                        {active && '✓'}
                      </span>

                      {value.hexColor && (
                        <span
                          aria-hidden="true"
                          style={{ backgroundColor: value.hexColor }}
                          className="border-border-strong size-4 rounded-full border"
                        />
                      )}

                      <span className={active ? 'text-foreground' : 'text-muted-foreground'}>
                        {value.labelHe}
                      </span>

                      <span className="sr-only">{active ? ', הסרת הסינון' : ', הוספה לסינון'}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </fieldset>
  );
}

/**
 * Price range.
 *
 * A real form, submitted with the Enter key or the button, which pushes the
 * resulting URL. Two number inputs rather than a dual-thumb slider: a slider
 * needs a drag implementation with its own keyboard story and buys nothing a
 * pair of inputs does not already give.
 *
 * The placeholders show the category's ACTUAL price bounds, so the range being
 * asked for is anchored to what exists rather than to an arbitrary scale.
 */
function PriceFilter({
  facet,
  query,
  basePath,
}: {
  facet: Facet;
  query: CatalogQuery;
  basePath: string;
}) {
  const router = useRouter();
  const minId = useId();
  const maxId = useId();

  const bounds = facet.priceBounds;
  const floor = bounds ? Math.floor(bounds.minAgorot / 100) : 0;
  const ceiling = bounds ? Math.ceil(bounds.maxAgorot / 100) : 0;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);

        const read = (name: string): number | null => {
          const raw = String(data.get(name) ?? '').trim();
          if (raw === '') return null;
          const parsed = Number.parseInt(raw, 10);
          return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
        };

        router.push(
          buildCatalogHref(basePath, query, {
            minPrice: read('minPrice'),
            maxPrice: read('maxPrice'),
          }),
          { scroll: false },
        );
      }}
    >
      <div className="flex items-center gap-2">
        <label htmlFor={minId} className="sr-only">
          מחיר מינימלי בשקלים
        </label>
        <input
          id={minId}
          name="minPrice"
          type="number"
          inputMode="numeric"
          min={0}
          defaultValue={query.minPrice ?? ''}
          placeholder={String(floor)}
          className="border-input focus:border-accent w-full rounded-sm border px-3 py-2 text-sm outline-none"
        />

        <span aria-hidden="true" className="text-muted-foreground">
          –
        </span>

        <label htmlFor={maxId} className="sr-only">
          מחיר מקסימלי בשקלים
        </label>
        <input
          id={maxId}
          name="maxPrice"
          type="number"
          inputMode="numeric"
          min={0}
          defaultValue={query.maxPrice ?? ''}
          placeholder={String(ceiling)}
          className="border-input focus:border-accent w-full rounded-sm border px-3 py-2 text-sm outline-none"
        />
      </div>

      <button
        type="submit"
        className="border-border-strong hover:bg-muted mt-2 h-9 w-full rounded-sm border text-sm"
      >
        עדכון טווח מחירים
      </button>
    </form>
  );
}
