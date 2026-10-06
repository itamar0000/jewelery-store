import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { fromShekels } from '@/lib/money';

import { ProductCard } from './ProductCard';
import type { ProductCardData } from './types';

/**
 * Rendered with `react-dom/server`, following the pattern established by
 * src/lib/rtl/bidi.test.tsx: the contract under test is the emitted markup, so
 * no DOM and no testing-library dependency is needed.
 */
const BASE: ProductCardData = {
  id: 'p1',
  slug: 'solitaire-ring',
  name: 'טבעת סוליטר',
  price: fromShekels(4900),
};

function render(product: ProductCardData) {
  return renderToStaticMarkup(<ProductCard product={product} />);
}

describe('ProductCard', () => {
  it('links to the product page', () => {
    expect(render(BASE)).toContain('href="/product/solitaire-ring"');
  });

  it('renders the name', () => {
    expect(render(BASE)).toContain('טבעת סוליטר');
  });

  /**
   * THE MOST IMPORTANT ASSERTION IN THIS FILE.
   *
   * The brief requires that low-stock messaging never appears by default and is
   * never invented. A regression here would put a fabricated scarcity claim in
   * front of a customer, which is a consumer-protection problem rather than a
   * cosmetic one.
   */
  describe('stock messaging', () => {
    it('says NOTHING about stock when no inventory data is supplied', () => {
      const markup = render(BASE);

      expect(markup).not.toContain('מלאי');
      expect(markup).not.toContain('נותרו');
      expect(markup).not.toContain('אחרון');
    });

    it('renders a notice only when one is explicitly passed', () => {
      const markup = render({ ...BASE, stockNotice: 'נותרו 2 במלאי' });
      expect(markup).toContain('נותרו 2 במלאי');
    });
  });

  describe('pricing', () => {
    it('formats the price through the money module', () => {
      // formatPrice emits a currency symbol and directional marks; asserting on
      // the digits alone would pass even if the money module were bypassed.
      const markup = render(BASE);
      expect(markup).toContain('₪');
      expect(markup).toContain('4,900');
    });

    /*
     * Whether prices are final is said once per grid, in words - never as a
     * per-card glyph that reads as a typo and explains itself only in the
     * footer.
     */
    it('carries no estimate glyph of its own', () => {
      expect(render(BASE)).not.toContain('≈');
    });

    it('says "החל מ־" when the options change the price, and only then', () => {
      expect(render({ ...BASE, priceFrom: true })).toContain('החל מ־');
      expect(render(BASE)).not.toContain('החל מ־');
    });

    it('omits a compare-at price when the product is not discounted', () => {
      expect(render(BASE)).not.toContain('line-through');
    });

    it('renders a struck-through compare-at price when one is supplied', () => {
      const markup = render({ ...BASE, compareAtPrice: fromShekels(5600) });

      expect(markup).toContain('line-through');
      expect(markup).toContain('5,600');
    });
  });

  describe('badge', () => {
    it('renders none by default', () => {
      expect(render(BASE)).not.toContain('חדש');
    });

    it('renders the one badge supplied', () => {
      expect(render({ ...BASE, badge: 'new' })).toContain('חדש');
    });

    /*
     * Retired labels must not come back through the card's own copy table.
     * "בהזמנה אישית" is the norm in this workshop, and "רב מכר" is the band's
     * claim, made once (src/lib/catalog/best-sellers.ts).
     */
    it('has no label for best seller or made to order', () => {
      const markup = render({ ...BASE, badge: 'new' });

      expect(markup).not.toContain('רב מכר');
      expect(markup).not.toContain('בהזמנה אישית');
    });
  });

  /*
   * The heart toggled a state nothing kept. It is withheld until saving is
   * real (src/lib/placeholders.ts, `wishlist`), and it must not drift back in
   * as an inert control.
   */
  describe('wishlist', () => {
    it('offers no wishlist control while saving does not exist', () => {
      const markup = render(BASE);

      expect(markup).not.toContain('<button');
      expect(markup).not.toContain('מועדפים');
      expect(markup).not.toContain('data-placeholder');
    });
  });

  describe('accessibility', () => {
    it('uses a heading for the product name, so grids are navigable by heading', () => {
      expect(render(BASE)).toContain('<h3');
    });

    it('has exactly one link, named by the product', () => {
      const markup = render(BASE);

      expect(markup.match(/<a /g)).toHaveLength(1);
      expect(markup).toMatch(/<a [^>]*>טבעת סוליטר<\/a>/);
    });
  });
});

/*
 * The hover drift is motion, so it goes entirely under reduced motion. The
 * global rule only shortens transitions, which made the photograph SNAP to its
 * zoom instead of easing into it - a jump where a drift was meant.
 */
describe('ProductCard hover drift', () => {
  it('removes the zoom, rather than snapping to it, under reduced motion', () => {
    const markup = renderToStaticMarkup(
      <ProductCard
        product={{ ...BASE, imageUrl: 'https://media.example.com/public/p1.jpg', imageAlt: 'טבעת' }}
      />,
    );
    expect(markup).toContain('group-hover:scale-[1.04]');
    expect(markup).toContain('motion-reduce:group-hover:scale-100');
  });
});
