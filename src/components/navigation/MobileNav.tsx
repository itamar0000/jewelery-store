'use client';

import Link from 'next/link';
import { useEffect, useRef, type Dispatch } from 'react';

import { cn } from '@/components/ui/cn';
import { ChevronIcon, CloseIcon, SearchIcon } from '@/components/ui/icons';
import type { MenuAction, MenuState } from '@/lib/navigation/menu-state';
import type { NavItem } from '@/lib/navigation/taxonomy';
import { ariaCurrent } from '@/lib/navigation/current';

/**
 * Mobile navigation drawer.
 *
 * Hamburger is correct HERE and only here (MASTER_SPECIFICATION section 7);
 * the desktop navigation is always visible. Hidden from `lg` upward.
 *
 * DIALOG SEMANTICS. `role="dialog"` + `aria-modal` + `aria-label`, so it is
 * announced as a modal and assistive technology treats the page behind it as
 * inert.
 *
 * FOCUS, deliberately simple and reliable rather than a full focus trap:
 *   - on open, focus moves to the close button, so the first Tab lands in the
 *     drawer rather than back in the page behind it;
 *   - on close, focus returns to the hamburger that opened it - handled by
 *     Header, which owns that button;
 *   - Escape closes, wired at the drawer root so it fires from anywhere inside.
 *
 * A focus trap is intentionally not implemented: a partial, hand-rolled trap is
 * a common source of keyboard dead-ends, and the honest version needs a
 * dependency this phase does not warrant. The drawer covers the viewport and
 * the backdrop closes it, so the failure mode is mild.
 *
 * RTL: the drawer sits on the inline-start edge, which is the RIGHT in
 * Hebrew. `start-0` is logical, so the side follows the document direction
 * with no mirroring code.
 *
 * Body scroll locking lives in Header, because search shares the requirement.
 */
export function MobileNav({
  items,
  state,
  dispatch,
  pathname = null,
}: {
  /** The primary items to show - PRIMARY_NAV, less any the Header withholds. */
  items: readonly NavItem[];
  state: MenuState;
  dispatch: Dispatch<MenuAction>;
  /** The page's path, so the section the visitor is in can be marked. */
  pathname?: string | null;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (state.mobileMenuOpen) closeRef.current?.focus();
  }, [state.mobileMenuOpen]);

  if (!state.mobileMenuOpen) return null;

  return (
    <div className="lg:hidden">
      {/* Backdrop. Decorative: Escape and the close button are the accessible
          paths, so this carries no role and no tab stop. */}
      <div
        aria-hidden="true"
        onClick={() => dispatch({ type: 'CLOSE_MOBILE_MENU' })}
        className="bg-scrim/35 fixed inset-0 z-40 backdrop-blur-[2px]"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="תפריט ניווט"
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            dispatch({ type: 'CLOSE_MOBILE_MENU' });
          }
        }}
        /*
         * NO ENTRY ANIMATION, deliberately.
         *
         * A slide-in keyframe was tried and removed. The drawer's resting
         * position is correct on its own (`start-0`), but a slide animation
         * makes the animation the ONLY thing that brings it on screen: it
         * starts translated a full width away and relies on the clock to
         * return it. Observed in testing, an animation whose clock does not
         * advance - a throttled or background-rendered tab - leaves the drawer
         * parked off-screen while body scroll is locked, which presents as a
         * completely broken page.
         *
         * The brief asks for a simple and reliable drawer and warns against
         * over-animating, so the trade is easy: no motion, and the failure mode
         * disappears. Section 2 asks for restraint anyway.
         *
         * IT STATES ITS OWN FOREGROUND AND FOCUS RING. The drawer is rendered
         * inside the ink masthead and would otherwise inherit its paper type -
         * paper on this paper sheet, which once left every item, and the close
         * button, invisible. See MegaMenu for the same rule.
         */
        className="bg-card text-card-foreground fixed inset-y-0 start-0 z-50 flex w-[min(22rem,88vw)] flex-col shadow-xl [--focus-ring:var(--color-ring)]"
      >
        <div className="border-border flex h-16 shrink-0 items-center justify-between border-b px-5">
          <span className="text-sm font-medium">תפריט</span>
          <button
            ref={closeRef}
            type="button"
            onClick={() => dispatch({ type: 'CLOSE_MOBILE_MENU' })}
            className="hover:bg-muted inline-flex size-11 items-center justify-center rounded-sm"
          >
            <CloseIcon className="size-5" />
            <span className="sr-only">סגירת התפריט</span>
          </button>
        </div>

        <nav aria-label="ניווט ראשי בנייד" className="flex-1 overflow-y-auto overscroll-contain">
          <ul className="py-2">
            {items.map((item) => {
              const hasChildren = item.columns !== undefined;
              const expanded = state.mobileExpandedGroup === item.id;
              const panelId = `mobile-group-${item.id}`;

              if (!hasChildren) {
                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      onClick={() => dispatch({ type: 'CLOSE_MOBILE_MENU' })}
                      aria-current={ariaCurrent(item.href, pathname)}
                      className="hover:bg-muted aria-[current]:decoration-foreground block px-5 py-4 text-base aria-[current]:font-semibold aria-[current]:underline aria-[current]:underline-offset-[0.4em]"
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              }

              return (
                <li key={item.id}>
                  {/*
                   * TWO CONTROLS, ONE ROW. The label is a link straight to the
                   * category, matching the desktop behaviour - tapping "טבעות"
                   * goes to all rings. The chevron is a separate button that
                   * expands the subcategories.
                   *
                   * Splitting them is what makes both reachable on a
                   * touchscreen, where there is no hover to open the list and a
                   * single control cannot both navigate and expand. Each has
                   * its own accessible name, so they are distinguishable in a
                   * screen reader's control list.
                   */}
                  <div className="hover:bg-muted flex items-stretch">
                    <Link
                      href={item.href}
                      onClick={() => dispatch({ type: 'CLOSE_MOBILE_MENU' })}
                      aria-current={ariaCurrent(item.href, pathname)}
                      className="aria-[current]:decoration-foreground flex-1 px-5 py-4 text-base aria-[current]:font-semibold aria-[current]:underline aria-[current]:underline-offset-[0.4em]"
                    >
                      {item.label}
                    </Link>

                    <button
                      type="button"
                      aria-expanded={expanded}
                      aria-controls={panelId}
                      onClick={() => dispatch({ type: 'TOGGLE_MOBILE_GROUP', id: item.id })}
                      className="flex w-14 items-center justify-center"
                    >
                      {/*
                       * DOWN, NOT SIDEWAYS. The row opens a list in place, which
                       * is what a downward chevron says - the same mark the
                       * desktop menu uses. A sideways chevron says "go to
                       * another screen", and in this right-to-left drawer it
                       * pointed right, which reads as back (critique 2026-10-06).
                       */}
                      <ChevronIcon
                        className={cn(
                          'text-muted-foreground size-4 rotate-90 transition-transform duration-200',
                          expanded && '-rotate-90',
                        )}
                      />
                      <span className="sr-only">
                        {expanded ? `סגירת ${item.label}` : `פתיחת תת-הקטגוריות של ${item.label}`}
                      </span>
                    </button>
                  </div>

                  {expanded && (
                    <ul id={panelId} className="bg-muted/60 pb-2">
                      {item.columns?.flatMap((column) =>
                        column.links.map((link) => (
                          <li key={link.id}>
                            <Link
                              href={link.href}
                              onClick={() => dispatch({ type: 'CLOSE_MOBILE_MENU' })}
                              className="text-muted-foreground hover:text-foreground block py-3 ps-9 pe-5 text-sm"
                            >
                              {link.label}
                            </Link>
                          </li>
                        )),
                      )}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/*
         * Search, from inside the drawer, where the header's own search button
         * sits under the backdrop. Section 7 also puts account and wishlist
         * here; they return when they work (src/lib/placeholders.ts). Alone,
         * search takes the form of the rows above it rather than a one-cell
         * icon grid.
         */}
        <div className="border-border shrink-0 border-t">
          <button
            type="button"
            onClick={() => dispatch({ type: 'OPEN_SEARCH' })}
            className="hover:bg-muted flex w-full items-center gap-3 px-5 py-4 text-base"
          >
            <SearchIcon className="text-muted-foreground size-5" />
            חיפוש
          </button>
        </div>
      </div>
    </div>
  );
}
