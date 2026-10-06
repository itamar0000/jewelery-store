import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { MobileNav } from '@/components/navigation/MobileNav';
import { INITIAL_MENU_STATE } from '@/lib/navigation/menu-state';
import { PRIMARY_NAV } from '@/lib/navigation/taxonomy';

import { Header } from './Header';

// Client components reach for the App Router; there is none under Vitest.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: () => {} }),
  usePathname: () => '/',
}));

/**
 * The header invites contact only when a contact channel exists.
 *
 * PRODUCT.md: "A site that invites a conversation it cannot receive is worse
 * than one that does not invite it." The channels are configuration
 * (src/lib/contact); the header is told whether any exist.
 */
describe('Header', () => {
  it('offers no "צור קשר" while no contact channel is configured', () => {
    const markup = renderToStaticMarkup(<Header />);

    expect(markup).not.toContain('href="/contact"');
    expect(markup).not.toContain('צור קשר');
  });

  it('offers "צור קשר" once a channel exists', () => {
    const markup = renderToStaticMarkup(<Header contactAvailable />);

    expect(markup).toContain('href="/contact"');
  });

  it('keeps every other primary item either way', () => {
    const markup = renderToStaticMarkup(<Header />);

    for (const href of [
      '/rings',
      '/earrings',
      '/necklaces',
      '/bracelets',
      '/sets',
      '/custom',
      '/faq',
    ]) {
      expect(markup).toContain(`href="${href}"`);
    }
  });
});

/**
 * Wishlist and account are withheld until they work (src/lib/placeholders.ts);
 * the cart stays. The drawer is the Header's, so it is held to the same rule.
 */
describe('Header utilities', () => {
  const masthead = renderToStaticMarkup(<Header />);
  const drawer = renderToStaticMarkup(
    <MobileNav
      items={PRIMARY_NAV}
      state={{ ...INITIAL_MENU_STATE, mobileMenuOpen: true }}
      dispatch={() => {}}
    />,
  );

  it('keeps search and the cart', () => {
    expect(masthead).toContain('חיפוש');
    expect(masthead).toContain('href="/cart"');
  });

  it('shows the count of what is in the bag, and nothing for an empty one', () => {
    expect(masthead).toContain('<span class="sr-only">סל הקניות</span>');
    expect(masthead).not.toMatch(/tabular-nums">\d+<\/span>/);

    const one = renderToStaticMarkup(<Header cartCount={1} />);
    expect(one).toContain('<span class="sr-only">סל הקניות, פריט אחד</span>');

    const three = renderToStaticMarkup(<Header cartCount={3} />);
    expect(three).toMatch(/aria-hidden="true"[^>]*tabular-nums">3<\/span>/);
    expect(three).toContain('<span class="sr-only">סל הקניות, 3 פריטים</span>');
  });

  it('links to no wishlist and no account, in the masthead or the drawer', () => {
    for (const markup of [masthead, drawer]) {
      expect(markup).not.toContain('href="/wishlist"');
      expect(markup).not.toContain('href="/account"');
      expect(markup).not.toContain('מועדפים');
      expect(markup).not.toContain('החשבון שלי');
    }
  });

  it('keeps search in the drawer', () => {
    expect(drawer).toContain('חיפוש</button>');
  });
});
