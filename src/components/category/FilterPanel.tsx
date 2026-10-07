'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId, useRef, useState } from 'react';

import { cn } from '@/components/ui/cn';
import { Button } from '@/components/ui/Button';
import { CheckIcon, CloseIcon, FilterIcon, MinusIcon, PlusIcon } from '@/components/ui/icons';
import {
  activeFilterCount,
  buildCatalogHref,
  type CatalogQuery,
  type Facet,
  type FacetCounts,
} from '@/lib/catalog/filters';
import { ACTIVE_FILTERS, PRODUCTS, countOf } from '@/lib/i18n/count';

import { CatalogLink, useCatalogNavigation } from './CatalogTransition';
import { RESULTS_ANCHOR } from './Pagination';
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
 * the URL - and it now survives a filter change, because the listing no longer
 * remounts on one (./CatalogTransition.tsx).
 *
 * EVERY VALUE SAYS HOW MANY PRODUCTS IT LEADS TO, counted by the database with
 * the listing's own predicate. A value that would lead to none is still shown -
 * the catalogue has it, just not with the other choices - but it is not a
 * link: a filter whose only outcome is an empty grid is a dead end, and the
 * number says why before anyone taps it.
 */
export function FilterBar({
  facets,
  query,
  basePath,
  productCount,
  priceNote = null,
  counts = {},
}: {
  facets: readonly Facet[];
  query: CatalogQuery;
  /** Category path without query string, e.g. `/rings`. */
  basePath: string;
  productCount: number;
  /**
   * "המחירים משוערים" while prices are placeholders, `null` once they are
   * final. Said once here, for the whole grid, rather than on every card.
   */
  priceNote?: string | null;
  /** Products each facet value would show, given the other active filters. */
  counts?: FacetCounts;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const drawerRef = useRef<HTMLDivElement>(null);

  /*
   * THE DRAWER'S MAIN BUTTON APPLIES A TYPED PRICE. Every other filter
   * navigates the moment it is tapped, but a price is typed, and the range
   * used to apply only through its own small button: a shopper who typed
   * 5,000 and pressed "הצגת 16 מוצרים" saw 16 products, the price silently
   * discarded (critique 2026-10-06, P1). A range that differs from the
   * address is submitted first; then the drawer closes on the results.
   */
  const closeDrawer = () => {
    const form = drawerRef.current?.querySelector<HTMLFormElement>('form[data-price-filter]');
    if (form && priceTyped(form, query)) form.requestSubmit();
    setOpen(false);
  };
  const activeCount = activeFilterCount(query);
  const pending = useCatalogNavigation()?.pending ?? false;

  return (
    <>
      {/* The anchor a new page scrolls to: the top of the results, not the
          top of the page (Pagination). */}
      <div
        id={RESULTS_ANCHOR}
        className="border-border flex scroll-mt-[calc(var(--header-height)+1rem)] flex-wrap items-center justify-between gap-3 border-b pb-4"
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((value) => !value)}
            className={cn(
              'inline-flex h-11 items-center gap-2 rounded-full border px-5 text-sm transition-colors',
              open || activeCount > 0
                ? 'border-accent bg-accent text-accent-foreground'
                : 'border-border-strong hover:bg-muted',
            )}
          >
            <FilterIcon className="size-4" />
            סינון
            {activeCount > 0 && <span aria-hidden="true">({activeCount})</span>}
            {activeCount > 0 && (
              <span className="sr-only">{countOf(activeCount, ACTIVE_FILTERS)}</span>
            )}
          </button>

          {/*
           * The count is live, because it changes on every filter navigation
           * and a screen-reader user needs to hear the result set change size.
           * The price note is not: it does not change, and re-announcing it on
           * every filter would bury the count.
           */}
          <p className="text-muted-foreground text-sm">
            <span aria-live="polite">{countOf(productCount, PRODUCTS)}</span>
            {priceNote && <> · {priceNote}</>}
          </p>
        </div>

        <SortControl query={query} basePath={basePath} />
      </div>

      {/* Desktop: panel opens downward, above the grid. */}
      <div id={panelId} hidden={!open} className="border-border hidden border-b py-6 lg:block">
        <MadeToMeasureNote className="mb-4" />
        <div className="grid gap-x-10 gap-y-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {facets.map((facet) => (
            <FilterGroup
              key={facet.code}
              facet={facet}
              query={query}
              basePath={basePath}
              counts={counts[facet.code]}
            />
          ))}
        </div>
      </div>

      {/* Mobile: side drawer. */}
      {open && (
        <div className="lg:hidden">
          <div
            aria-hidden="true"
            onClick={() => setOpen(false)}
            className="bg-scrim/35 fixed inset-0 z-40"
          />

          <div
            ref={drawerRef}
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
                className="hover:bg-muted inline-flex size-11 items-center justify-center rounded-sm"
              >
                <CloseIcon className="size-5" />
                <span className="sr-only">סגירת הסינון</span>
              </button>
            </div>

            <div className="divide-border flex-1 divide-y overflow-y-auto overscroll-contain px-4">
              <MadeToMeasureNote className="py-4" />
              {facets.map((facet) => (
                <FilterGroup
                  key={facet.code}
                  facet={facet}
                  query={query}
                  basePath={basePath}
                  counts={counts[facet.code]}
                  inDrawer
                />
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
             * therefore says how many products are waiting and closes - after
             * applying a price that was typed and not yet sent (closeDrawer).
             *
             * Reset is a `Link` for the same reason every value is - it is a
             * navigation to the unfiltered URL, so it works with the back
             * button and can be opened in a new tab.
             */}
            <div className="border-border flex shrink-0 items-center gap-3 border-t p-4">
              {activeCount > 0 && (
                <CatalogLink
                  href={buildCatalogHref(basePath, query, { clearAll: true, sort: query.sort })}
                  onClick={() => setOpen(false)}
                  className="text-muted-foreground hover:text-foreground inline-flex h-12 shrink-0 items-center text-sm underline underline-offset-4 transition-colors"
                >
                  נקה סינון
                </CatalogLink>
              )}

              {/* Says what is waiting behind the drawer; while a change is still
                  arriving the figure is the old one, so it dims with the grid. */}
              <button
                type="button"
                onClick={closeDrawer}
                aria-busy={pending || undefined}
                className={cn(
                  'bg-stamp text-stamp-foreground hover:bg-stamp-hover inline-flex h-12 flex-1 items-center justify-center rounded-full text-sm font-medium transition-[background-color,opacity]',
                  pending && 'opacity-70',
                )}
              >
                {productCount === 0
                  ? 'אין מוצרים מתאימים'
                  : `הצגת ${countOf(productCount, PRODUCTS)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Where a shopper looks for a colour or a size filter, the reason there is
 * none: every model is made to order in any of them (PRODUCT.md), so a filter
 * could only say which models happen to LIST a value - and it hid most of the
 * catalogue from someone asking for exactly what the workshop makes on
 * request. They are chosen on the product page instead.
 */
function MadeToMeasureNote({ className }: { className?: string }) {
  return (
    <p className={cn('text-soft-foreground text-sm', className)}>
      אין צורך לסנן לפי גוון זהב, קראט, מידה או אורך: כל דגם אפשר להזמין בכל אחד מהם.
    </p>
  );
}

/** Whether the price form holds a range the address does not have yet. */
function priceTyped(form: HTMLFormElement, query: CatalogQuery): boolean {
  const data = new FormData(form);
  const read = (name: string) => {
    const raw = String(data.get(name) ?? '').trim();
    return raw === '' ? null : Number.parseInt(raw, 10);
  };
  return read('minPrice') !== query.minPrice || read('maxPrice') !== query.maxPrice;
}

function FilterGroup({
  facet,
  query,
  basePath,
  counts,
  inDrawer = false,
}: {
  facet: Facet;
  query: CatalogQuery;
  basePath: string;
  /** Products per value; absent when the page did not count them. */
  counts?: Readonly<Record<string, number>>;
  /** In the phone drawer, whose main button applies a typed price. */
  inDrawer?: boolean;
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
    /*
     * THE TOGGLE OWNS THE ROW. The group used to carry the vertical padding
     * and the button only the 22px of its text, so a tap a few pixels above
     * or below "קראט זהב" landed on nothing. The padding moved into the
     * button; the row draws exactly as before.
     */
    <fieldset className="py-1">
      <legend className="sr-only">{facet.labelHe}</legend>

      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-12 w-full items-center justify-between text-start text-sm font-medium"
      >
        {facet.labelHe}
        {open ? (
          <MinusIcon className="text-muted-foreground size-4" />
        ) : (
          <PlusIcon className="text-muted-foreground size-4" />
        )}
      </button>

      {open && (
        <div id={panelId} className="pb-3">
          {facet.code === 'price' ? (
            <PriceFilter facet={facet} query={query} basePath={basePath} inDrawer={inDrawer} />
          ) : (
            <ul
              className={cn(
                facet.code === 'gold_color'
                  ? 'flex flex-wrap gap-3'
                  : 'space-y-2 pointer-coarse:space-y-0',
              )}
            >
              {facet.values.map((value) => {
                const active = query.values[facet.code].includes(value.value);
                const count = counts?.[value.value];
                const href = buildCatalogHref(
                  basePath,
                  query,
                  { toggle: { code: facet.code, token: value.token } },
                  [facet],
                );

                // Nothing to show with the other choices: stated, not offered.
                // A chosen value always stays a link, so it can be cleared.
                if (count === 0 && !active) {
                  return (
                    <li key={value.value}>
                      <span className="text-muted-foreground/70 flex items-center gap-2 text-sm pointer-coarse:min-h-11">
                        <span
                          aria-hidden="true"
                          className="border-border size-4 shrink-0 rounded-sm border"
                        />
                        {value.hexColor && (
                          <span
                            aria-hidden="true"
                            style={{ backgroundColor: value.hexColor }}
                            className="border-border size-4 rounded-full border opacity-50"
                          />
                        )}
                        {value.labelHe}
                        <span aria-hidden="true" className="text-xs tabular-nums">
                          0
                        </span>
                        <span className="sr-only">, אין מוצרים מתאימים לבחירה הנוכחית</span>
                      </span>
                    </li>
                  );
                }

                return (
                  <li key={value.value}>
                    {/* 44px rows where the pointer is a finger; the list stays
                        compact under a mouse. */}
                    <CatalogLink
                      href={href}
                      className="group flex items-center gap-2 text-sm pointer-coarse:min-h-11"
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          'flex size-4 shrink-0 items-center justify-center rounded-sm border',
                          active
                            ? 'border-accent bg-accent text-accent-foreground'
                            : 'border-border-strong group-hover:border-foreground',
                        )}
                      >
                        {active && <CheckIcon className="size-3" strokeWidth={2.5} />}
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

                      {count !== undefined && (
                        <span
                          aria-hidden="true"
                          className="text-muted-foreground text-xs tabular-nums"
                        >
                          {count}
                        </span>
                      )}

                      <span className="sr-only">
                        {count !== undefined && `, ${countOf(count, PRODUCTS)}`}
                        {active ? ', הסרת הסינון' : ', הוספה לסינון'}
                      </span>
                    </CatalogLink>
                  </li>
                );
              })}
            </ul>
          )}

          {/* No natural stone here: the 0 says so, and this says what to do
              about it - any model can be asked for with one (D4D.15). */}
          {facet.code === 'diamond_type' && counts?.natural === 0 && (
            <p className="text-soft-foreground mt-3 text-sm">
              {'יהלום טבעי אפשר לבקש לכל דגם. '}
              <Link
                href="/custom/request"
                className="decoration-border-strong hover:decoration-accent touch-target underline underline-offset-[0.35em]"
              >
                לבקשת התאמה
              </Link>
            </p>
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
  inDrawer,
}: {
  facet: Facet;
  query: CatalogQuery;
  basePath: string;
  inDrawer: boolean;
}) {
  const router = useRouter();
  const navigation = useCatalogNavigation();

  const bounds = facet.priceBounds;
  const floor = bounds ? Math.floor(bounds.minAgorot / 100) : 0;
  const ceiling = bounds ? Math.ceil(bounds.maxAgorot / 100) : 0;

  return (
    <form
      data-price-filter
      // The inputs are uncontrolled, so a range cleared elsewhere (its chip,
      // "נקה סינון") would linger in them; keying on the range in the URL
      // resets them to it.
      key={`${query.minPrice}-${query.maxPrice}`}
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);

        const read = (name: string): number | null => {
          const raw = String(data.get(name) ?? '').trim();
          if (raw === '') return null;
          const parsed = Number.parseInt(raw, 10);
          return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
        };

        const href = buildCatalogHref(basePath, query, {
          minPrice: read('minPrice'),
          maxPrice: read('maxPrice'),
        });
        if (navigation) navigation.navigate(href);
        else router.push(href, { scroll: false });
      }}
    >
      {/*
       * UNDERLINES, NOT BOXES (DESIGN.md, Inputs): a strong hairline that
       * goes to ink while the field has focus, the shekel sign drawn in the
       * field so the bare numbers read as prices. Each field is its own
       * <label>, so a tap anywhere on its 44px - the shekel sign included -
       * focuses the number. The field keeps the global focus ring as well.
       */}
      <div className="flex items-center gap-3">
        <label className="border-input focus-within:border-accent flex h-11 flex-1 cursor-text items-center gap-1.5 border-b transition-colors">
          <span className="sr-only">מחיר מינימלי בשקלים</span>
          <span aria-hidden="true" className="text-muted-foreground text-sm">
            ₪
          </span>
          <input
            name="minPrice"
            type="number"
            inputMode="numeric"
            min={0}
            defaultValue={query.minPrice ?? ''}
            placeholder={floor.toLocaleString('he-IL')}
            className="h-full w-full bg-transparent text-sm pointer-coarse:text-base"
          />
        </label>

        <span aria-hidden="true" className="text-muted-foreground">
          –
        </span>

        <label className="border-input focus-within:border-accent flex h-11 flex-1 cursor-text items-center gap-1.5 border-b transition-colors">
          <span className="sr-only">מחיר מקסימלי בשקלים</span>
          <span aria-hidden="true" className="text-muted-foreground text-sm">
            ₪
          </span>
          <input
            name="maxPrice"
            type="number"
            inputMode="numeric"
            min={0}
            defaultValue={query.maxPrice ?? ''}
            placeholder={ceiling.toLocaleString('he-IL')}
            className="h-full w-full bg-transparent text-sm pointer-coarse:text-base"
          />
        </label>
      </div>

      {/* In the drawer the main button applies the range, and Enter does too;
          a second button for the same act would only compete with it. */}
      {!inDrawer && (
        <Button type="submit" variant="secondary" className="mt-3 w-full">
          עדכון טווח מחירים
        </Button>
      )}
    </form>
  );
}
