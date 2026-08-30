'use client';

import { useId, useState } from 'react';

import { cn } from '@/components/ui/cn';
import { CloseIcon, FilterIcon, MinusIcon, PlusIcon } from '@/components/ui/icons';
import { PLACEHOLDER_ATTR } from '@/lib/placeholders';

import { SortControl } from './SortControl';
import type { FilterDefinition } from './filter-config';

/**
 * The category toolbar: filter toggle, product count, sort - plus the filter
 * surface itself.
 *
 * FILTERS ARE OPT-IN, NOT PERMANENT FURNITURE. The first pass pinned a filter
 * sidebar to the inline-start edge at every desktop width. That is the
 * conventional catalog layout, and it was wrong here for two reasons: it spends
 * a quarter of the page on controls most visitors never touch, and it squeezes
 * the product grid - the actual content - into what is left. Closed by default,
 * the grid gets the full width.
 *
 * TWO PRESENTATIONS, ONE STATE:
 *   - DESKTOP opens a panel DOWNWARD, in the page flow above the grid, with the
 *     groups laid out in columns. Nothing overlaps the products, and the grid
 *     simply moves down.
 *   - MOBILE opens a side drawer, because a top panel on a phone would push the
 *     products entirely off-screen.
 *
 * Both are rendered and toggled with CSS, so the correct one is present without
 * a media-query hook and without a layout flash on first paint. Only one is
 * ever displayed, so only one is in the tab order.
 *
 * PLACEHOLDER (registry id `filters`). The controls respond, but nothing is
 * filtered or sorted: no URL is written and no query runs. Phase 3B moves
 * filter and sort state into the URL.
 */
export function FilterBar({
  filters,
  productCount,
}: {
  filters: readonly FilterDefinition[];
  productCount: number;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

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
              open
                ? 'border-foreground bg-foreground text-background'
                : 'border-border-strong hover:bg-muted',
            )}
            {...PLACEHOLDER_ATTR}
          >
            <FilterIcon className="size-4" />
            סינון
          </button>

          {/* Live, because once filtering is real this number changes without a
              page load and a screen-reader user needs to hear it. */}
          <p aria-live="polite" className="text-muted-foreground text-sm">
            {productCount} מוצרים
          </p>
        </div>

        <SortControl />
      </div>

      {/* Desktop: inline panel, above the grid. */}
      <div
        id={panelId}
        hidden={!open}
        className="border-border hidden border-b py-6 lg:block"
        {...PLACEHOLDER_ATTR}
      >
        <div className="grid gap-x-10 gap-y-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filters.map((filter) => (
            <FilterGroup key={filter.id} filter={filter} />
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
            {...PLACEHOLDER_ATTR}
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
              {filters.map((filter) => (
                <FilterGroup key={filter.id} filter={filter} />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * One filter group.
 *
 * A `<fieldset>` with a `<legend>`, so a screen reader announces which filter a
 * checkbox belongs to. The disclosure carries `aria-expanded`/`aria-controls`.
 */
function FilterGroup({ filter }: { filter: FilterDefinition }) {
  const [open, setOpen] = useState(true);
  const panelId = useId();

  return (
    <fieldset className="py-4">
      <legend className="sr-only">{filter.label}</legend>

      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between text-start text-sm font-medium"
      >
        {filter.label}
        {open ? (
          <MinusIcon className="text-muted-foreground size-4" />
        ) : (
          <PlusIcon className="text-muted-foreground size-4" />
        )}
      </button>

      {open && (
        <div id={panelId} className="mt-3">
          {filter.kind === 'range' ? (
            <RangeFilter />
          ) : (
            <ul className={cn(filter.kind === 'swatch' ? 'flex flex-wrap gap-3' : 'space-y-2')}>
              {filter.options?.map((option) => (
                <li key={option.id}>
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name={filter.id}
                      value={option.id}
                      className="accent-accent size-4"
                    />

                    {option.swatch && (
                      <span
                        aria-hidden="true"
                        style={{ backgroundColor: option.swatch }}
                        className="border-border-strong size-4 rounded-full border"
                      />
                    )}

                    <span className="text-muted-foreground">{option.label}</span>
                  </label>
                </li>
              ))}
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
 * Two number inputs rather than a dual-thumb slider: a slider needs a
 * dependency or a hand-rolled drag implementation with its own keyboard story,
 * and neither is justified while nothing is being filtered.
 */
function RangeFilter() {
  return (
    <div className="flex items-center gap-2">
      <label className="flex-1">
        <span className="sr-only">מחיר מינימלי</span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          placeholder="מ-"
          className="border-input focus:border-accent w-full rounded-sm border px-3 py-2 text-sm outline-none"
        />
      </label>

      <span aria-hidden="true" className="text-muted-foreground">
        –
      </span>

      <label className="flex-1">
        <span className="sr-only">מחיר מקסימלי</span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          placeholder="עד"
          className="border-input focus:border-accent w-full rounded-sm border px-3 py-2 text-sm outline-none"
        />
      </label>
    </div>
  );
}
