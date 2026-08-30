import { describe, expect, it } from 'vitest';

import { FOOTER_COLUMNS, PRIMARY_NAV, type NavItem } from './taxonomy';

/**
 * Structural guarantees for the navigation data.
 *
 * The taxonomy is plain data that several surfaces render blindly, so the
 * failure mode is not a crash - it is a duplicate React key, a menu that cannot
 * be opened because two items share an id, or a category quietly missing from
 * the header. These assert the shape the components rely on.
 */
function allLinks(item: NavItem) {
  return item.columns?.flatMap((column) => column.links) ?? [];
}

describe('PRIMARY_NAV', () => {
  it('carries the eight primary entries from specification section 6', () => {
    expect(PRIMARY_NAV.map((item) => item.id)).toEqual([
      'rings',
      'earrings',
      'necklaces',
      'bracelets',
      'sets',
      'gifts',
      'custom',
      'guides',
    ]);
  });

  it('gives the five product categories a mega menu, and the other three none', () => {
    const withMenus = PRIMARY_NAV.filter((item) => item.columns !== undefined).map((i) => i.id);

    expect(withMenus).toEqual(['rings', 'earrings', 'necklaces', 'bracelets', 'sets']);
  });

  it('uses unique top-level ids', () => {
    const ids = PRIMARY_NAV.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('uses globally unique link ids, which the React keys depend on', () => {
    const ids = PRIMARY_NAV.flatMap(allLinks).map((link) => link.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('starts every mega menu with an "all" link into the category itself', () => {
    // The trigger is a button rather than a link, so this is the only route to
    // the category landing page. Losing it strands the category.
    for (const item of PRIMARY_NAV.filter((candidate) => candidate.columns)) {
      expect(item.columns?.[0]?.links[0]?.href).toBe(item.href);
    }
  });

  it('points every href at an absolute path', () => {
    const hrefs = [
      ...PRIMARY_NAV.map((item) => item.href),
      ...PRIMARY_NAV.flatMap(allLinks).map((l) => l.href),
    ];

    for (const href of hrefs) {
      expect(href.startsWith('/')).toBe(true);
    }
  });
});

describe('FOOTER_COLUMNS', () => {
  it('covers the section 51 columns', () => {
    expect(FOOTER_COLUMNS.map((column) => column.id)).toEqual([
      'shop',
      'services',
      'about',
      'legal',
    ]);
  });

  it('uses unique link ids', () => {
    const ids = FOOTER_COLUMNS.flatMap((column) => column.links).map((link) => link.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
