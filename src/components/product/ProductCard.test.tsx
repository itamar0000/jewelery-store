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

    it('omits a compare-at price when the product is not discounted', () => {
      expect(render(BASE)).not.toContain('line-through');
    });

    it('renders a struck-through compare-at price when one is supplied', () => {
      const markup = render({ ...BASE, compareAtPrice: fromShekels(5600) });

      expect(markup).toContain('line-through');
      expect(markup).toContain('5,600');
    });
  });

  describe('badges', () => {
    it('renders none by default', () => {
      const markup = render(BASE);

      expect(markup).not.toContain('חדש');
      expect(markup).not.toContain('רב מכר');
    });

    it('renders each supplied badge', () => {
      const markup = render({ ...BASE, badges: ['new', 'best-seller', 'made-to-order'] });

      expect(markup).toContain('חדש');
      expect(markup).toContain('רב מכר');
      expect(markup).toContain('בהזמנה אישית');
    });
  });

  describe('accessibility', () => {
    it('names the wishlist button after the product, not just "add to wishlist"', () => {
      // A grid of eight identically-named buttons is unusable by screen reader.
      expect(render(BASE)).toContain('טבעת סוליטר למועדפים');
    });

    it('exposes the wishlist button as an unpressed toggle', () => {
      expect(render(BASE)).toContain('aria-pressed="false"');
    });

    it('marks the wishlist control as a placeholder', () => {
      expect(render(BASE)).toContain('data-placeholder="true"');
    });

    it('uses a heading for the product name, so grids are navigable by heading', () => {
      expect(render(BASE)).toContain('<h3');
    });

    it('does not nest the wishlist button inside the product link', () => {
      const markup = render(BASE);
      const linkStart = markup.indexOf('<a ');
      const linkEnd = markup.indexOf('</a>');
      const buttonStart = markup.indexOf('<button');

      // Invalid HTML with unpredictable behaviour if it ever regresses.
      expect(buttonStart === -1 || buttonStart < linkStart || buttonStart > linkEnd).toBe(true);
    });
  });
});
