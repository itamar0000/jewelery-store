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
 *   - KEYBOARD: focusing the trigger opens its panel; Escape closes it and
 *     returns focus to the trigger, which is where a keyboard user expects to
 *     land. Enter follows the link to the category.
 *   - FOCUS: tabbing into a panel keeps it open; `blur` that lands outside the
 *     nav closes it. This is what makes Tab-through work at all.
 *
 * THE TRIGGER IS A LINK, AND CLICKING IT NAVIGATES.
 *
 * The first pass made it a <button>, reasoning that a control which expands a
 * panel is a button, and left "כל הטבעות" inside the panel as the only route
 * to the category. That was wrong in practice: clicking a category name is the
 * most obvious thing a visitor does, and swallowing that click to toggle a
 * panel is a dead end - worst of all after hover has already opened the panel,
 * where the click then appears to do nothing at all.
 *
 * So the item is an <a> to the category, and the panel opens on hover AND on
 * focus. Keyboard users tab to the link, which opens the panel, then tab onward
 * into it; Enter navigates. The link carries `aria-expanded`, which ARIA 1.2
 * supports on role=link, so the state is still announced, and Escape closes and
 * returns focus to the link.
 *
 * Items without columns (Custom, FAQ, Contact) render as plain links with no
 * panel and no `aria-expanded`.
 */
export function DesktopNav({
  state,
  dispatch,
}: {
  state: MenuState;
  dispatch: Dispatch<MenuAction>;
}) {
  const triggerRefs = useRef(new Map<string, HTMLAnchorElement | null>());

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
              <Link
                href={item.href}
                id={triggerId}
                ref={(node) => {
                  triggerRefs.current.set(item.id, node);
                }}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onFocus={() => dispatch({ type: 'OPEN_MEGA_MENU', id: item.id })}
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
              </Link>

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
