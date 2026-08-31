import { NextResponse } from 'next/server';

import { getProductsByIds } from '@/lib/catalog/queries';
import { formatPrice } from '@/lib/money';
import { postgresSearchProvider } from '@/lib/search';

/**
 * Live suggestions for the search overlay.
 *
 * A route handler rather than a server action because the overlay calls it on
 * every keystroke (debounced) and needs a plain cancellable fetch, not a
 * transition.
 *
 * IT RETURNS DISPLAY-READY DATA. Prices are formatted here, on the server,
 * through the money module - the overlay never receives an agorot integer to
 * format itself, which is the same rule the rest of the storefront follows.
 *
 * `no-store`: suggestions reflect live catalog state, including which products
 * are published. Caching them at the edge would surface withdrawn products.
 */
export const dynamic = 'force-dynamic';

const MAX_PRODUCTS = 5;
const MAX_CATEGORIES = 3;

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get('q')?.trim().slice(0, 120) ?? '';

  if (q.length === 0) {
    return NextResponse.json(
      { products: [], categories: [] },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const [ranked, categories] = await Promise.all([
    postgresSearchProvider.searchProductIds(q, { limit: MAX_PRODUCTS }),
    postgresSearchProvider.suggestCategories(q, MAX_CATEGORIES),
  ]);

  const products = await getProductsByIds(ranked.map((hit) => hit.productId));

  return NextResponse.json(
    {
      products: products.map((product) => ({
        slug: product.slug,
        name: product.name,
        price: formatPrice(product.price),
      })),
      categories: categories.map((category) => ({
        nameHe: category.nameHe,
        href: category.href,
      })),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
