/**
 * Whether a menu item is the section the visitor is in: its own page, or any
 * page under it (`/rings/engagement-rings` is in "טבעות").
 *
 * The menu never said where the visitor was (critique 2026-10-06); it now marks
 * the item with `aria-current` and the rule it draws for an open menu. Paths
 * only: a product page sits under no section in its address, so nothing is
 * marked there rather than guessing.
 */
export function isCurrentSection(href: string, pathname: string | null): boolean {
  if (!pathname || href === '/') return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** `aria-current` for a menu item: "page" on its own page, "true" under it. */
export function ariaCurrent(href: string, pathname: string | null): 'page' | 'true' | undefined {
  if (!isCurrentSection(href, pathname)) return undefined;
  return pathname === href ? 'page' : 'true';
}
