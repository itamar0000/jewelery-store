'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type Dispatch } from 'react';

import { Container } from '@/components/ui/Container';
import { cn } from '@/components/ui/cn';
import { CloseIcon, SearchIcon } from '@/components/ui/icons';
import type { MenuAction, MenuState } from '@/lib/navigation/menu-state';

/**
 * Search overlay with live suggestions.
 *
 * THE OVERLAY IS A SHORTCUT, NOT A RESULTS PAGE. It shows at most five
 * products and three categories, then hands off to /search. Keeping it small is
 * deliberate: a suggestion list that fills the viewport is just a worse results
 * page rendered in a modal, and it competes with the page it is supposed to
 * lead to.
 *
 * KEYBOARD NAVIGATION follows the combobox pattern that browsers and screen
 * readers already understand:
 *   - the input owns `aria-expanded` and `aria-activedescendant`, so focus
 *     never leaves the field and typing continues to work while arrowing;
 *   - Down/Up move through a FLAT list of everything selectable - products,
 *     categories, then "all results" - because that is what the eye sees;
 *   - Enter follows the highlighted item, or submits the raw query when
 *     nothing is highlighted;
 *   - Escape closes.
 *
 * Suggestions are fetched from /api/search/suggest, debounced, with each
 * in-flight request aborted when the next keystroke arrives - so a slow
 * response cannot overwrite a newer one.
 */
interface SuggestProduct {
  readonly slug: string;
  readonly name: string;
  readonly price: string;
}

interface SuggestCategory {
  readonly nameHe: string;
  readonly href: string;
}

const DEBOUNCE_MS = 180;
const MIN_QUERY = 2;

export function SearchOverlay({
  state,
  dispatch,
}: {
  state: MenuState;
  dispatch: Dispatch<MenuAction>;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [term, setTerm] = useState('');
  const [products, setProducts] = useState<readonly SuggestProduct[]>([]);
  const [categories, setCategories] = useState<readonly SuggestCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);

  // Focus the field on open: an overlay that needs a further click to type in
  // is a broken search box.
  useEffect(() => {
    if (state.searchOpen) inputRef.current?.focus();
  }, [state.searchOpen]);

  // Reset when it closes, so reopening does not flash the previous query.
  useEffect(() => {
    if (!state.searchOpen) {
      setTerm('');
      setProducts([]);
      setCategories([]);
      setActive(-1);
    }
  }, [state.searchOpen]);

  useEffect(() => {
    const query = term.trim();

    if (query.length < MIN_QUERY) {
      setProducts([]);
      setCategories([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    const timer = setTimeout(() => {
      fetch(`/api/search/suggest?q=${encodeURIComponent(query)}`, { signal: controller.signal })
        .then((response) => (response.ok ? response.json() : { products: [], categories: [] }))
        .then((data: { products: SuggestProduct[]; categories: SuggestCategory[] }) => {
          setProducts(data.products);
          setCategories(data.categories);
          setActive(-1);
        })
        .catch(() => {
          // An aborted request is the normal case on every keystroke, and a
          // failed one should leave the overlay usable rather than throw.
        })
        .finally(() => setLoading(false));
    }, DEBOUNCE_MS);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [term]);

  if (!state.searchOpen) return null;

  const trimmed = term.trim();
  const showAll = trimmed.length >= MIN_QUERY;

  /** Everything arrowable, in the order it appears on screen. */
  const items: { id: string; href: string }[] = [
    ...products.map((product) => ({ id: `p-${product.slug}`, href: `/product/${product.slug}` })),
    ...categories.map((category) => ({ id: `c-${category.href}`, href: category.href })),
    ...(showAll ? [{ id: 'all', href: `/search?q=${encodeURIComponent(trimmed)}` }] : []),
  ];

  function go(href: string) {
    dispatch({ type: 'CLOSE_SEARCH' });
    router.push(href);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      dispatch({ type: 'CLOSE_SEARCH' });
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((current) => (items.length === 0 ? -1 : (current + 1) % items.length));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((current) =>
        items.length === 0 ? -1 : (current - 1 + items.length) % items.length,
      );
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const target = items[active];

      // Nothing highlighted means "search for what I typed", which is what
      // pressing Enter in a search box has always meant.
      if (target) go(target.href);
      else if (trimmed.length > 0) go(`/search?q=${encodeURIComponent(trimmed)}`);
    }
  }

  const activeId = active >= 0 ? items[active]?.id : undefined;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="חיפוש באתר"
      onKeyDown={onKeyDown}
      className="bg-background fixed inset-0 z-50 overflow-y-auto"
    >
      <Container className="py-6">
        <div className="flex items-start gap-4">
          <form
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              if (trimmed.length > 0) go(`/search?q=${encodeURIComponent(trimmed)}`);
            }}
            className="border-border-strong focus-within:border-accent flex flex-1 items-center gap-3 border-b pb-3 transition-colors"
          >
            <SearchIcon className="text-muted-foreground size-5 shrink-0" />
            <input
              ref={inputRef}
              type="search"
              name="q"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              autoComplete="off"
              role="combobox"
              aria-expanded={items.length > 0}
              aria-controls="search-suggestions"
              aria-activedescendant={activeId}
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

        {/* One live region for the whole result set, so a screen reader hears
            "3 תוצאות" once rather than each item as it arrives. */}
        <p aria-live="polite" className="sr-only">
          {loading
            ? 'טוען הצעות'
            : showAll
              ? `${products.length} מוצרים, ${categories.length} קטגוריות`
              : ''}
        </p>

        <div id="search-suggestions" className="mt-8">
          {trimmed.length < MIN_QUERY ? (
            <PopularSearches onPick={(value) => setTerm(value)} />
          ) : (
            <>
              {products.length > 0 && (
                <section aria-labelledby="suggest-products">
                  <h2
                    id="suggest-products"
                    className="text-muted-foreground text-2xs mb-3 font-medium"
                  >
                    מוצרים
                  </h2>

                  <ul>
                    {products.map((product) => {
                      const id = `p-${product.slug}`;
                      return (
                        <li key={product.slug}>
                          <Link
                            id={id}
                            href={`/product/${product.slug}`}
                            onClick={() => dispatch({ type: 'CLOSE_SEARCH' })}
                            className={cn(
                              'flex items-center justify-between gap-4 rounded-sm px-3 py-2.5 text-sm transition-colors',
                              activeId === id ? 'bg-muted' : 'hover:bg-muted',
                            )}
                          >
                            <span>{product.name}</span>
                            <span className="text-muted-foreground shrink-0 text-xs">
                              {product.price}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}

              {categories.length > 0 && (
                <section aria-labelledby="suggest-categories" className="mt-6">
                  <h2
                    id="suggest-categories"
                    className="text-muted-foreground text-2xs mb-3 font-medium"
                  >
                    קטגוריות
                  </h2>

                  <ul>
                    {categories.map((category) => {
                      const id = `c-${category.href}`;
                      return (
                        <li key={category.href}>
                          <Link
                            id={id}
                            href={category.href}
                            onClick={() => dispatch({ type: 'CLOSE_SEARCH' })}
                            className={cn(
                              'block rounded-sm px-3 py-2.5 text-sm transition-colors',
                              activeId === id ? 'bg-muted' : 'hover:bg-muted',
                            )}
                          >
                            {category.nameHe}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}

              {!loading && products.length === 0 && categories.length === 0 && (
                <p className="text-muted-foreground px-3 text-sm">
                  אין הצעות עבור &quot;{trimmed}&quot;.
                </p>
              )}

              {showAll && (
                <Link
                  id="all"
                  href={`/search?q=${encodeURIComponent(trimmed)}`}
                  onClick={() => dispatch({ type: 'CLOSE_SEARCH' })}
                  className={cn(
                    'border-border mt-6 block rounded-sm border px-3 py-3 text-center text-sm transition-colors',
                    activeId === 'all' ? 'bg-muted' : 'hover:bg-muted',
                  )}
                >
                  לכל תוצאות החיפוש
                </Link>
              )}
            </>
          )}
        </div>
      </Container>
    </div>
  );
}

/**
 * Popular searches, shown before anything is typed.
 *
 * SAMPLE DATA, NOT BUSINESS LOGIC. These are the example queries from
 * MASTER_SPECIFICATION section 27; nothing branches on their values, and a
 * future provider replaces them with real popularity data. Clicking one fills
 * the field rather than navigating, so the shopper can refine it first.
 */
const POPULAR_SEARCHES: readonly string[] = [
  'טבעת אירוסין',
  'צמיד טניס',
  'עגילי יהלום',
  'שרשרת שם',
  'זהב לבן',
];

function PopularSearches({ onPick }: { onPick: (value: string) => void }) {
  return (
    <section aria-labelledby="search-popular">
      <h2 id="search-popular" className="text-muted-foreground text-2xs mb-4 font-medium">
        חיפושים פופולריים
      </h2>

      <ul className="flex flex-wrap gap-2">
        {POPULAR_SEARCHES.map((suggestion) => (
          <li key={suggestion}>
            <button
              type="button"
              onClick={() => onPick(suggestion)}
              className="border-border hover:border-border-strong hover:bg-muted rounded-full border px-4 py-2 text-sm transition-colors"
            >
              {suggestion}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
