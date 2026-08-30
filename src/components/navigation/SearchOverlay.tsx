'use client';

import { useEffect, useRef, type Dispatch } from 'react';

import { Container } from '@/components/ui/Container';
import { CloseIcon, SearchIcon } from '@/components/ui/icons';
import type { MenuAction, MenuState } from '@/lib/navigation/menu-state';
import { PLACEHOLDER_ATTR } from '@/lib/placeholders';

/**
 * Search overlay.
 *
 * PLACEHOLDER (registry id `search`). The field accepts text and the form does
 * not submit; no query runs and no suggestions are fetched.
 * MASTER_SPECIFICATION section 27 describes the eventual smart search - popular
 * searches, live suggestions, products, categories, collections - and Phase 3B
 * builds the `SearchProvider` port behind it.
 *
 * THE SHAPE IS THE DELIVERABLE. The overlay already lays out the three result
 * regions section 27 calls for, so wiring it later is a data change rather than
 * a redesign. The regions are `<section>`s with headings for exactly that
 * reason.
 *
 * THE POPULAR SEARCHES ARE SAMPLE DATA, NOT BUSINESS LOGIC. They come from the
 * section 27 example queries and sit in a module constant that a future
 * provider replaces with real popularity data. Nothing branches on their
 * values.
 *
 * `onSubmit` calls `preventDefault` rather than navigating: a search route that
 * returns nothing would be a worse placeholder than an honest no-op.
 */
const POPULAR_SEARCHES: readonly string[] = [
  'טבעת אירוסין',
  'צמיד טניס',
  'עגילי יהלום',
  'שרשרת שם',
  'טבעת זהב לבן',
];

export function SearchOverlay({
  state,
  dispatch,
}: {
  state: MenuState;
  dispatch: Dispatch<MenuAction>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the field on open: an overlay that requires a further click to type
  // in is a broken search box.
  useEffect(() => {
    if (state.searchOpen) inputRef.current?.focus();
  }, [state.searchOpen]);

  if (!state.searchOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="חיפוש באתר"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          dispatch({ type: 'CLOSE_SEARCH' });
        }
      }}
      className="bg-background fixed inset-0 z-50 overflow-y-auto"
      {...PLACEHOLDER_ATTR}
    >
      <Container className="py-6">
        <div className="flex items-start gap-4">
          <form
            role="search"
            onSubmit={(event) => event.preventDefault()}
            className="border-border-strong focus-within:border-accent flex flex-1 items-center gap-3 border-b pb-3 transition-colors"
          >
            <SearchIcon className="text-muted-foreground size-5 shrink-0" />
            <input
              ref={inputRef}
              type="search"
              name="q"
              autoComplete="off"
              placeholder="חיפוש תכשיטים"
              aria-label="חיפוש תכשיטים"
              className="placeholder:text-muted-foreground w-full bg-transparent text-lg outline-none"
            />
          </form>

          <button
            type="button"
            onClick={() => dispatch({ type: 'CLOSE_SEARCH' })}
            className="hover:bg-muted inline-flex size-10 shrink-0 items-center justify-center rounded-sm"
          >
            <CloseIcon className="size-5" />
            <span className="sr-only">סגירת החיפוש</span>
          </button>
        </div>

        <section aria-labelledby="search-popular" className="mt-10">
          <h2 id="search-popular" className="text-muted-foreground text-2xs mb-4 font-medium">
            חיפושים פופולריים
          </h2>

          <ul className="flex flex-wrap gap-2">
            {POPULAR_SEARCHES.map((term) => (
              <li key={term}>
                {/*
                 * A button, not a link: there is no search route yet, and a
                 * link to nowhere is worse than an inert control. It fills the
                 * field so the interaction is at least honest about intent.
                 */}
                <button
                  type="button"
                  onClick={() => {
                    if (inputRef.current) {
                      inputRef.current.value = term;
                      inputRef.current.focus();
                    }
                  }}
                  className="border-border hover:border-border-strong hover:bg-muted rounded-full border px-4 py-2 text-sm transition-colors"
                >
                  {term}
                </button>
              </li>
            ))}
          </ul>
        </section>

        {/*
         * Result regions. Empty until Phase 3B supplies a provider - rendered
         * now so the layout is settled and the wiring has somewhere to land.
         */}
        <p className="text-muted-foreground mt-12 border-t border-dashed pt-6 text-xs">
          חיפוש חי, הצעות, מוצרים וקטגוריות יחוברו בשלב הבא. כרגע זהו מבנה בלבד.
        </p>
      </Container>
    </div>
  );
}
