'use client';

import { useState } from 'react';

import { cn } from '@/components/ui/cn';
import { CloseIcon, FilterIcon, MinusIcon, PlusIcon } from '@/components/ui/icons';
import { PLACEHOLDER_ATTR } from '@/lib/placeholders';

import type { FilterDefinition } from './filter-config';

/**
 * Category filter panel.
 *
 * PLACEHOLDER (registry id `filters`). Controls render and respond to clicks,
 * but nothing is filtered: no URL is written and no query runs. Phase 3B moves
 * filter state into the URL, which the plan lists as an acceptance criterion
 * ("filter and sort state lives entirely in the URL and survives reload").
 *
 * The visual architecture IS the deliverable, and it is category-generic: this
 * component receives `FilterDefinition[]` and renders by `kind`. It contains no
 * reference to rings, necklaces or any other category, so connecting real
 * filters is a data change (see ./filter-config.ts).
 *
 * ONE COMPONENT, TWO PRESENTATIONS. Desktop shows a persistent sidebar; mobile
 * shows the same groups inside a full-height drawer behind a Filter button
 * (section 50 requires mobile filters as a first-class control). Rendering the
 * groups twice from one definition is what keeps the two in step.
 *
 * Accessibility: every group is a `<fieldset>` with a `<legend>`, so a screen
 * reader announces which filter a checkbox belongs to; the disclosure button
 * carries `aria-expanded` and `aria-controls`; the drawer is a labelled modal
 * dialog that closes on Escape.
 */
export function FilterPanel({ filters }: { filters: readonly FilterDefinition[] }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      {/* Mobile trigger. Hidden once the sidebar is visible. */}
      <button
        type="button"
        aria-expanded={drawerOpen}
        onClick={() => setDrawerOpen(true)}
        className="border-border-strong hover:bg-muted inline-flex h-11 items-center gap-2 rounded-sm border px-4 text-sm lg:hidden"
        {...PLACEHOLDER_ATTR}
      >
        <FilterIcon className="size-4" />
        סינון
      </button>

      {/* Desktop sidebar. */}
      <div className="hidden lg:block" {...PLACEHOLDER_ATTR}>
        <FilterGroups filters={filters} />
      </div>

      {/* Mobile drawer. */}
      {drawerOpen && (
        <div className="lg:hidden">
          <div
            aria-hidden="true"
            onClick={() => setDrawerOpen(false)}
            className="bg-foreground/25 fixed inset-0 z-40"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label="סינון מוצרים"
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault();
                setDrawerOpen(false);
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
                onClick={() => setDrawerOpen(false)}
                className="hover:bg-muted inline-flex size-10 items-center justify-center rounded-sm"
              >
                <CloseIcon className="size-5" />
                <span className="sr-only">סגירת הסינון</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain px-4">
              <FilterGroups filters={filters} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function FilterGroups({ filters }: { filters: readonly FilterDefinition[] }) {
  return (
    <div className="divide-border divide-y">
      {filters.map((filter) => (
        <FilterGroup key={filter.id} filter={filter} />
      ))}
    </div>
  );
}

function FilterGroup({ filter }: { filter: FilterDefinition }) {
  const [open, setOpen] = useState(true);
  const panelId = `filter-panel-${filter.id}`;

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
            <ul className={cn(filter.kind === 'swatch' ? 'flex flex-wrap gap-2' : 'space-y-2')}>
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
 * and neither is justified while nothing is being filtered. The inputs already
 * express the contract - a minimum and a maximum in shekels.
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
