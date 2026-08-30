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
      <Container className="relative flex h-16 items-center justify-between gap-4">
        {/* Hamburger: mobile only. Desktop navigation is always visible
            (section 6), so this is hidden from `lg` upward. */}
        <button
          ref={hamburgerRef}
          type="button"
          aria-expanded={state.mobileMenuOpen}
          onClick={() => dispatch({ type: 'TOGGLE_MOBILE_MENU' })}
          className="hover:bg-muted -ms-2 inline-flex size-10 items-center justify-center rounded-sm lg:hidden"
        >
          <MenuIcon className="size-5" />
          <span className="sr-only">פתיחת תפריט הניווט</span>
        </button>

        {/*
         * Wordmark. PLACEHOLDER - the brand name and logo are TBD
         * (section 2 and 57). Set as plain type rather than an invented mark,
         * so nothing here reads as a settled identity.
         */}
        <Link
          href="/"
          className="tracking-snug shrink-0 text-base font-medium whitespace-nowrap lg:me-4 lg:text-lg"
          aria-label="לדף הבית"
        >
          חנות תכשיטים
        </Link>

        <DesktopNav state={state} dispatch={dispatch} />

        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => dispatch({ type: 'OPEN_SEARCH' })}
            className="hover:bg-muted inline-flex size-10 items-center justify-center rounded-sm"
            {...PLACEHOLDER_ATTR}
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
            className="hover:bg-muted hidden size-10 items-center justify-center rounded-sm sm:inline-flex"
            {...PLACEHOLDER_ATTR}
          >
            <HeartIcon className="size-5" />
            <span className="sr-only">מועדפים</span>
          </Link>

          <Link
            href="/account"
            className="hover:bg-muted hidden size-10 items-center justify-center rounded-sm sm:inline-flex"
            {...PLACEHOLDER_ATTR}
          >
            <UserIcon className="size-5" />
            <span className="sr-only">החשבון שלי</span>
          </Link>

          <Link
            href="/cart"
            className="hover:bg-muted -me-2 inline-flex size-10 items-center justify-center rounded-sm"
            {...PLACEHOLDER_ATTR}
          >
            <BagIcon className="size-5" />
            <span className="sr-only">סל הקניות</span>
          </Link>
        </div>
      </Container>

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
