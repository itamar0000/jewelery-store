'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useReducer, useRef } from 'react';

import { DesktopNav } from '@/components/navigation/DesktopNav';
import { MobileNav } from '@/components/navigation/MobileNav';
import { SearchOverlay } from '@/components/navigation/SearchOverlay';
import { Container } from '@/components/ui/Container';
import { cn } from '@/components/ui/cn';
import { BagIcon, HeartIcon, MenuIcon, SearchIcon, UserIcon } from '@/components/ui/icons';
import { INITIAL_MENU_STATE, isScrollLocked, menuReducer } from '@/lib/navigation/menu-state';
import { PLACEHOLDER_ATTR } from '@/lib/placeholders';

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
export function Header() {
  const [state, dispatch] = useReducer(menuReducer, INITIAL_MENU_STATE);
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
      className={cn(
        'bg-background sticky top-0 z-30 transition-shadow duration-200',
        scrolled ? 'border-border border-b shadow-sm' : 'border-b border-transparent',
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
      <Container className="flex h-16 items-center gap-4 lg:h-20">
        <div className="flex flex-1 items-center justify-start">
          {/* Hamburger: mobile only. Desktop navigation is always visible
              (section 6), so this is hidden from `lg` upward. */}
          <button
            ref={hamburgerRef}
            type="button"
            aria-expanded={state.mobileMenuOpen}
            onClick={() => dispatch({ type: 'TOGGLE_MOBILE_MENU' })}
            className="hover:text-accent -ms-2 inline-flex size-10 items-center justify-center transition-colors lg:hidden"
          >
            <MenuIcon className="size-5" />
            <span className="sr-only">פתיחת תפריט הניווט</span>
          </button>
        </div>

        {/*
         * Wordmark. PLACEHOLDER - the brand name and logo are TBD
         * (section 2 and 57). Set as plain type rather than an invented mark,
         * so nothing here reads as a settled identity. Given real size and the
         * centre of the masthead, because "the brand is TBD" is a reason not to
         * invent a LOGO, not a reason to leave the name looking like a link.
         */}
        <Link
          href="/"
          className="tracking-tight shrink-0 text-lg font-medium whitespace-nowrap lg:text-2xl"
          aria-label="לדף הבית"
        >
          חנות תכשיטים
        </Link>

        <div className="flex flex-1 items-center justify-end">
          {/*
           * Icons lose the filled hover chip they had. A grey rounded square
           * under the cursor is app chrome; at this size the colour shift alone
           * reads as the more expensive interaction, and the hit area stays the
           * full 40px either way.
           */}
          <button
            type="button"
            onClick={() => dispatch({ type: 'OPEN_SEARCH' })}
            className="hover:text-accent inline-flex size-10 items-center justify-center transition-colors"
          >
            <SearchIcon className="size-5" />
            <span className="sr-only">חיפוש</span>
          </button>

          {/*
           * Wishlist, account and cart are links to placeholder routes. None
           * shows a count: a badge reading "0" would be a claim about state
           * that no system is tracking yet.
           */}
          <Link
            href="/wishlist"
            className="hover:text-accent hidden size-10 items-center justify-center transition-colors sm:inline-flex"
            {...PLACEHOLDER_ATTR}
          >
            <HeartIcon className="size-5" />
            <span className="sr-only">מועדפים</span>
          </Link>

          <Link
            href="/account"
            className="hover:text-accent hidden size-10 items-center justify-center transition-colors sm:inline-flex"
            {...PLACEHOLDER_ATTR}
          >
            <UserIcon className="size-5" />
            <span className="sr-only">החשבון שלי</span>
          </Link>

          <Link
            href="/cart"
            className="hover:text-accent -me-2 inline-flex size-10 items-center justify-center transition-colors"
            {...PLACEHOLDER_ATTR}
          >
            <BagIcon className="size-5" />
            <span className="sr-only">סל הקניות</span>
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
      <div className="border-border/70 relative hidden border-t lg:block">
        <Container>
          <DesktopNav state={state} dispatch={dispatch} />
        </Container>
      </div>

      <MobileNav state={state} dispatch={dispatch} />
      <SearchOverlay state={state} dispatch={dispatch} />
    </header>
  );
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
