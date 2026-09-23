import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { fromShekels } from '@/lib/money';

import { ProductGrid } from './ProductGrid';
import type { ProductCardData } from './types';

/**
 * Rendered with `react-dom/server`, following ProductCard.test.tsx: the
 * contract under test is the emitted markup.
 *
 * WHY THIS FILE EXISTS. Lighthouse measured `/necklaces` on mobile and scored
 * `lcp-lazy-loaded` at zero: the Largest Contentful Paint element was a product
 * photograph carrying `loading="lazy"`, and LCP landed at 3.4 seconds. The grid
 * now loads its first row without waiting.
 *
 * That is a one-word change and therefore an easy one to lose - a refactor of
 * the `map` callback, or a well-meant "every image should be lazy" sweep, would
 * silently restore the defect and nothing else in the suite would notice. These
 * assertions are here to make that fail loudly.
 */
function product(n: number): ProductCardData {
  return {
    id: `p${n}`,
    slug: `product-${n}`,
    name: `מוצר ${n}`,
    price: fromShekels(4900),
    imageUrl: `https://media.example.com/public/p${n}.jpg`,
    imageAlt: `מוצר ${n}`,
  };
}

function render(count: number): string {
  return renderToStaticMarkup(
    <ProductGrid products={Array.from({ length: count }, (_, i) => product(i + 1))} />,
  );
}

/** The `<img>` tags in document order. */
function images(markup: string): readonly string[] {
  return markup.match(/<img\b[^>]*>/g) ?? [];
}

describe('ProductGrid image loading', () => {
  it('renders one image per product', () => {
    expect(images(render(8))).toHaveLength(8);
  });

  /**
   * The grid is two columns at the narrowest breakpoint, so the first two
   * cards are on screen for every visitor and one of them is the LCP element.
   */
  it('does NOT lazy-load the first two images', () => {
    const [first, second] = images(render(8));

    expect(first).not.toContain('loading="lazy"');
    expect(second).not.toContain('loading="lazy"');
  });

  /**
   * `next/image` marks a priority image by OMITTING `loading` entirely - the
   * HTML default is eager - and emitting a `<link rel="preload">` into the
   * document head. The preload is not part of this subtree's markup, so it
   * cannot be asserted here; the absent attribute is the visible half, and it
   * is what separates these two from the explicit `loading="eager"` of the
   * next pair below.
   */
  it('marks the first two as priority, not merely eager', () => {
    const [first, second] = images(render(8));

    for (const img of [first, second]) {
      expect(img).not.toContain('loading=');
    }
  });

  /**
   * The third and fourth cards complete the first row at the wider
   * breakpoints, so they must not wait for the lazy-load observer - but they
   * are not the LCP on any viewport that shows them, so they must not hold a
   * preload either. A preload competes with every other preload; marking the
   * whole row would have four images fighting for the same bandwidth and could
   * leave LCP slower than lazy-loading did.
   */
  it('loads the third and fourth images eagerly but does NOT preload them', () => {
    const [, , third, fourth] = images(render(8));

    for (const img of [third, fourth]) {
      expect(img).toContain('loading="eager"');
      expect(img).not.toContain('fetchpriority="high"');
    }
  });

  /** Below the fold at every breakpoint, so deferring them is the point. */
  it('lazy-loads everything from the fifth card on', () => {
    const rest = images(render(8)).slice(4);

    expect(rest).toHaveLength(4);
    for (const img of rest) {
      expect(img).toContain('loading="lazy"');
      expect(img).not.toContain('fetchpriority="high"');
    }
  });

  /** A short grid must not index past its own products. */
  it('handles a grid shorter than the first row', () => {
    const markup = render(1);

    expect(images(markup)).toHaveLength(1);
    expect(images(markup)[0]).not.toContain('loading="lazy"');
  });
});
