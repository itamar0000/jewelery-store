import Link from 'next/link';

import type { NavLink } from '@/lib/navigation/taxonomy';

/**
 * Subcategory chips beneath a category title.
 *
 * MASTER_SPECIFICATION section 9 item 4, and the section 8 distinction that
 * matters: this is NAVIGATION ("what type of product am I looking for?"), not
 * filtering ("which exact product is right for me?"). They look similar and are
 * different systems - these are links that change the page, and each one is a
 * real, indexable URL.
 *
 * That is also why they are links and not toggle buttons: a subcategory is a
 * destination, and rendering it as a button would break opening one in a new
 * tab and would hide it from the links list a screen-reader user browses by.
 *
 * Scrolls horizontally on narrow screens rather than wrapping to three rows.
 */
export function SubcategoryNav({
  links,
  activeId,
}: {
  links: readonly NavLink[];
  activeId?: string;
}) {
  if (links.length === 0) return null;

  return (
    // Centred from `md`, matching the centred page hero above it. On narrow
    // screens it stays a start-aligned horizontal scroller, because centring a
    // row that overflows hides its first item off the edge.
    //
    // NO SCROLLBAR. It drew a grey bar under the chips on every phone-width
    // window; the row already runs to the screen edge, and a chip cut off
    // there is the sign that it scrolls. `py-1` (cancelled by `-my-1`) is
    // room for the chips' 44px tap area, which a scroller would otherwise clip.
    <nav
      aria-label="תת-קטגוריות"
      className="-mx-6 -my-1 [scrollbar-width:none] overflow-x-auto px-6 py-1 md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden"
    >
      <ul className="flex w-max gap-2 md:w-auto md:flex-wrap">
        {links.map((link) => {
          const active = link.id === activeId;

          return (
            <li key={link.id}>
              <Link
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={
                  active
                    ? 'bg-foreground text-background touch-target inline-flex h-9 items-center px-4 text-sm'
                    : 'border-border hover:border-border-strong hover:bg-muted touch-target inline-flex h-9 items-center border px-4 text-sm transition-colors'
                }
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
