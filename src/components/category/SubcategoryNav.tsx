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
    <nav aria-label="תת-קטגוריות" className="-mx-6 overflow-x-auto px-6 md:mx-0 md:px-0">
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
                    ? 'bg-foreground text-background inline-flex h-9 items-center rounded-full px-4 text-sm'
                    : 'border-border hover:border-border-strong hover:bg-muted inline-flex h-9 items-center rounded-full border px-4 text-sm transition-colors'
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
