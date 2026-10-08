'use client';

import { SITE_NAME } from '@/lib/config/site';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useReducer, useRef } from 'react';

import { DesktopNav } from '@/components/navigation/DesktopNav';
import { MobileNav } from '@/components/navigation/MobileNav';
import { SearchOverlay } from '@/components/navigation/SearchOverlay';
import { Container } from '@/components/ui/Container';
import { cn } from '@/components/ui/cn';
import { BagIcon, MenuIcon, SearchIcon } from '@/components/ui/icons';
import { ITEMS, countOf } from '@/lib/i18n/count';
import { INITIAL_MENU_STATE, isScrollLocked, menuReducer } from '@/lib/navigation/menu-state';
import { PRIMARY_NAV } from '@/lib/navigation/taxonomy';

/**
 * The storefront header.
 *
 * OWNS ALL NAVIGATION STATE, through the reducer in
 * `@/lib/navigation/menu-state`, and passes it down. Desktop nav, mobile drawer
 * and search overlay are siblings that must exclude one another, so a single
 * owner is the only way that invariant holds; the reducer states it once and is
 * unit-tested without a DOM.
 *
 * STICKY, with a restrained scroll treatment: the header gains a hairline
 * border and a soft shadow once the page has moved, and nothing else. It does
 * not shrink, hide on scroll-down or animate its contents - the visual
 * direction asks for restraint (MASTER_SPECIFICATION section 2), and a header
 * that moves under the cursor is a usability cost, not a flourish.
 *
 * The scroll listener is passive and only ever flips one boolean.
 */
export function Header({
  contactAvailable = false,
  cartCount = 0,
}: {
  /**
   * Whether any contact channel is configured (src/lib/contact). Without one,
   * "צור קשר" leaves the navigation: an item leading to a page with no way to
   * get in touch is an invitation the shop cannot answer.
   */
  contactAvailable?: boolean;
  /**
   * Units in the bag, read by the layout from the cart cookie on every
   * request, so the count is right on the first paint and after every change
   * (the cart's actions revalidate the layout).
   */
  cartCount?: number;
}) {
  const [state, dispatch] = useReducer(menuReducer, INITIAL_MENU_STATE);
  const navItems = contactAvailable
    ? PRIMARY_NAV
    : PRIMARY_NAV.filter((item) => item.id !== 'contact');
  const [scrolled, setScrolled] = useReducerScrolled();
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  // A route change must not leave a drawer or panel open over the new page.
  useEffect(() => {
    dispatch({ type: 'DISMISS_ALL' });
  }, [pathname]);

  // Body scroll lock while a full-viewport surface is open. Restoring the
  // previous value rather than clearing it keeps this safe if anything else
  // ever manages overflow.
  useEffect(() => {
    if (!isScrollLocked(state)) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previous;
    };
  }, [state]);

  // Focus returns to the hamburger when the drawer closes. Without this,
  // dismissing the drawer drops focus onto <body> and a keyboard user restarts
  // from the top of the document.
  //
  // NOT when search opened from inside the drawer, though: that path closes the
  // drawer as a side effect, and the search overlay has already focused its own
  // input. Restoring here would yank focus back out of the field the user just
  // asked for.
  const drawerWasOpen = useRef(false);
  useEffect(() => {
    if (drawerWasOpen.current && !state.mobileMenuOpen && !state.searchOpen) {
      hamburgerRef.current?.focus();
    }
    drawerWasOpen.current = state.mobileMenuOpen;
  }, [state.mobileMenuOpen, state.searchOpen]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [setScrolled]);

  return (
    <header
      /*
       * THE MASTHEAD IS IVORY, RULED (D4D.26). The atelier's header is the
       * page's own ground with one hairline under it, so the photographs and
       * the green actions stay the only weight at the top of the screen. It
       * was an ink bar in the paper-and-ink world this one replaces.
       */
      className={cn(
        'bg-background text-foreground border-border sticky top-0 z-30 border-b transition-shadow duration-200',
        scrolled ? 'shadow-md' : '',
      )}
    >
      {/*
       * ROW 1 - the masthead: wordmark centred, utilities at the inline end.
       *
       * The first pass ran everything in ONE row: wordmark, then eight nav
       * items, then four icons. At 1440 that packed the navigation into the
       * middle third at `text-sm` with 8px of padding per item, and the
       * wordmark carried exactly the same visual weight as the word "צמידים"
       * next to it - so the page had no brand, only a toolbar.
       *
       * Splitting the two jobs is what boutique mastheads do, and it buys both
       * of them room: the name gets the optical centre and a size of its own,
       * and the navigation gets a full-width row on the line below.
       *
       * The two `flex-1` cells are what centre the wordmark OPTICALLY rather
       * than by text-align: they balance each other, so the name sits in the
       * true middle of the container whatever the icons do.
       */}
      <Container width="wide" className="flex h-16 items-center gap-4 lg:h-16">
        {/*
         * THE HOUSE MARK LEADS THE ROW, at the inline start - the RIGHT of this
         * RTL page - which is where FIRST VIEWPORT places it and where a
         * packet carries the mark of the house that handled it. It was
         * centred, optically balanced between two flex cells; that read well
         * but was an uncited deviation from the contract, and a mark a visitor
         * meets first is worth more than a symmetrical masthead.
         */}
        <div className="flex flex-1 items-center justify-start gap-2">
          {/*
           * THE HOUSE MARK: the name in the display serif, no box. No drawn
           * logo exists (PRODUCT.md); when one lands it replaces this text.
           */}
          <Link href="/" className="touch-target shrink-0 py-1" aria-label="לדף הבית">
            {/*
             * `bdi` ISOLATES THE NAME. The wordmark is Latin inside a Hebrew
             * RTL document, and a bare Latin run in RTL text lets the bidi
             * algorithm pull neighbouring characters into it and reorder the
             * words around it. Isolating it means the mark always reads
             * left-to-right as written, wherever it is placed.
             */}
            <bdi className="font-display block text-[1.375rem] leading-none font-normal tracking-[0.02em] whitespace-nowrap lg:text-[1.625rem]">
              {SITE_NAME}
            </bdi>
          </Link>

          {/* Hamburger: mobile only. Desktop navigation is always visible
              (section 6), so this is hidden from `lg` upward. */}
          <button
            ref={hamburgerRef}
            type="button"
            aria-expanded={state.mobileMenuOpen}
            onClick={() => dispatch({ type: 'TOGGLE_MOBILE_MENU' })}
            className="text-muted-foreground hover:text-foreground -ms-2 inline-flex size-11 items-center justify-center transition-colors lg:hidden"
          >
            <MenuIcon className="size-5" />
            <span className="sr-only">פתיחת תפריט הניווט</span>
          </button>
        </div>

        <div className="flex flex-1 items-center justify-end">
          {/*
           * Icons lose the filled hover chip they had. A grey rounded square
           * under the cursor is app chrome; at this size the colour shift alone
           * reads as the more expensive interaction. The hit area is 44px - a
           * fingertip, not a cursor - and nothing visible grows with it.
           */}
          <button
            type="button"
            onClick={() => dispatch({ type: 'OPEN_SEARCH' })}
            className="text-muted-foreground hover:text-foreground inline-flex size-11 items-center justify-center transition-colors"
          >
            <SearchIcon className="size-5" />
            <span className="sr-only">חיפוש</span>
          </button>

          {/*
           * Search and the cart only. Wishlist and account icons are withheld
           * until saving and signing in exist (src/lib/placeholders.ts): an
           * icon for a feature that does nothing is a promise the masthead
           * repeats on every page.
           *
           * THE COUNT IS A NUMERAL, NOT A BADGE. A filled disc on the corner of
           * the bag is app chrome; a figure set beside it in full paper - the
           * one thing on the bar at full strength besides the mark - is how a
           * printed masthead would say it. Nothing at zero: an empty bag needs
           * no announcement. The spoken name carries the count either way.
           */}
          <Link
            href="/cart"
            className="text-muted-foreground hover:text-foreground -me-2 inline-flex h-11 min-w-11 items-center justify-center gap-1.5 px-1 transition-colors"
          >
            <BagIcon className="size-5" />
            {cartCount > 0 && (
              <span aria-hidden="true" className="text-foreground text-sm font-medium tabular-nums">
                {cartCount}
              </span>
            )}
            <span className="sr-only">{cartLabel(cartCount)}</span>
          </Link>
        </div>
      </Container>

      {/*
       * ROW 2 - primary navigation, desktop only.
       *
       * `relative` lives here rather than on the masthead because the mega menu
       * panel is positioned `top-full` against its nearest positioned ancestor:
       * anchoring it to this row is what makes it open under the whole header
       * instead of through the middle of it.
       */}
      <div className="border-border relative hidden border-t lg:block">
        <Container width="wide">
          <DesktopNav items={navItems} state={state} dispatch={dispatch} pathname={pathname} />
        </Container>
      </div>

      <MobileNav items={navItems} state={state} dispatch={dispatch} pathname={pathname} />
      <SearchOverlay state={state} dispatch={dispatch} />
    </header>
  );
}

/** The cart link's spoken name: "סל הקניות, פריט אחד", "סל הקניות, 3 פריטים". */
export function cartLabel(count: number): string {
  if (count <= 0) return 'סל הקניות';
  return `סל הקניות, ${countOf(count, ITEMS)}`;
}

/**
 * Scroll flag.
 *
 * A tiny reducer rather than `useState` so the setter identity is stable and
 * the scroll effect does not re-subscribe on every render.
 */
function useReducerScrolled() {
  return useReducer((_: boolean, next: boolean) => next, false);
}
