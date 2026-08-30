'use client';

import Link from 'next/link';
import { useRef, type Dispatch } from 'react';

import { ChevronIcon } from '@/components/ui/icons';
import { cn } from '@/components/ui/cn';
import type { MenuAction, MenuState } from '@/lib/navigation/menu-state';
import { PRIMARY_NAV } from '@/lib/navigation/taxonomy';

import { MegaMenu } from './MegaMenu';

/**
 * Desktop primary navigation.
 *
 * NO HAMBURGER ON DESKTOP - MASTER_SPECIFICATION section 6 states this twice
 * and the implementation plan lists it as an acceptance criterion. Every
 * primary item is visible from `lg` upward; the hamburger lives in MobileNav
 * and is hidden at this breakpoint.
 *
 * INTERACTION MODEL. The brief requires the menu to work by keyboard, which
 * rules out the common hover-only implementation. Three paths open a panel and
 * all three are equal:
 *
 *   - POINTER: `mouseenter` on an item opens it, `mouseleave` on the whole nav
 *     closes it. No click needed, no delay to fight.
 *   - KEYBOARD: the trigger is a real <button> with `aria-expanded` and
 *     `aria-controls`. Enter/Space toggles; Escape closes and returns focus to
 *     the trigger, which is where a keyboard user expects to land.
 *   - FOCUS: tabbing into a panel keeps it open; `blur` that lands outside the
 *     nav closes it. This is what makes Tab-through work at all.
 *
 * WHY THE TRIGGER IS A BUTTON AND NOT A LINK. A control that expands a panel is
 * a button; announcing it as a link and then not navigating is a lie to a
 * screen reader. The category page is not lost - "כל הטבעות" is the first link
 * inside every panel, which is also the more discoverable position.
 *
 * Items without columns (Gifts, Custom, Guides) render as plain links, because
 * they genuinely navigate.
 */
export function DesktopNav({
  state,
  dispatch,
}: {
  state: MenuState;
  dispatch: Dispatch<MenuAction>;
}) {
  const triggerRefs = useRef(new Map<string, HTMLButtonElement | null>());

  function closeAndRestoreFocus(id: string) {
    dispatch({ type: 'CLOSE_MEGA_MENU' });
    triggerRefs.current.get(id)?.focus();
  }

  return (
    <nav
      aria-label="ניווט ראשי"
      className="hidden lg:block"
      onMouseLeave={() => dispatch({ type: 'CLOSE_MEGA_MENU' })}
      onBlur={(event) => {
        // Close only when focus actually leaves the nav. Moving between the
        // trigger and its own panel must not flicker the menu shut.
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          dispatch({ type: 'CLOSE_MEGA_MENU' });
        }
      }}
    >
      <ul className="flex items-center">
        {PRIMARY_NAV.map((item) => {
          const hasMenu = item.columns !== undefined;
          const isOpen = state.openMegaMenu === item.id;
          const panelId = `megamenu-${item.id}`;
          const triggerId = `megamenu-trigger-${item.id}`;

          if (!hasMenu) {
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className="hover:text-accent inline-flex h-16 items-center px-2 text-sm whitespace-nowrap transition-colors duration-150 xl:px-3"
                >
                  {item.label}
                </Link>
              </li>
            );
          }

          return (
            <li
              key={item.id}
              onMouseEnter={() => dispatch({ type: 'OPEN_MEGA_MENU', id: item.id })}
            >
              <button
                type="button"
                id={triggerId}
                ref={(node) => {
                  triggerRefs.current.set(item.id, node);
                }}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() =>
                  dispatch(
                    isOpen ? { type: 'CLOSE_MEGA_MENU' } : { type: 'OPEN_MEGA_MENU', id: item.id },
                  )
                }
                onKeyDown={(event) => {
                  if (event.key === 'Escape' && isOpen) {
                    event.preventDefault();
                    closeAndRestoreFocus(item.id);
                  }
                }}
                className={cn(
                  'inline-flex h-16 items-center gap-1 px-2 text-sm whitespace-nowrap transition-colors duration-150 xl:px-3',
                  isOpen ? 'text-accent' : 'hover:text-accent',
                )}
              >
                {item.label}
                <ChevronIcon
                  className={cn(
                    'size-3.5 rotate-90 transition-transform duration-200',
                    isOpen && '-rotate-90',
                  )}
                />
              </button>

              {isOpen && (
                <div
                  id={panelId}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                      event.preventDefault();
                      closeAndRestoreFocus(item.id);
                    }
                  }}
                >
                  <MegaMenu item={item} labelledBy={triggerId} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
