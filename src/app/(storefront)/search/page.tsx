import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';

import { CategoryResults, CategoryResultsSkeleton } from '@/components/category/CategoryResults';
import { SearchField } from '@/components/search/SearchField';
import { PageHero } from '@/components/storefront/PageHero';
import { Container } from '@/components/ui/Container';
import { parseCatalogSearchParams, type SearchParams } from '@/lib/catalog/filters';
import { getCategories } from '@/lib/catalog/queries';
import { postgresSearchProvider } from '@/lib/search';
import {
  SEARCH_EXAMPLES,
  SEARCH_EXAMPLES_HEADING,
  SEARCH_RETRY_HEADING,
} from '@/lib/search/examples';

/**
 * Search results.
 *
 * REUSES THE CATALOG LISTING WHOLESALE. The provider returns ranked product
 * ids; `CategoryResults` then applies the active filters, the sort and the
 * paging with the same code the category pages use. Search contributes
 * relevance and nothing else, which is what stops it becoming a second catalog
 * with its own subtly different filtering.
 *
 * `categoryIds: []` means "no category restriction" - `buildCatalogWhere`
 * produces a category predicate that matches nothing on an empty list, so the
 * restriction comes purely from the ranked ids instead.
 *
 * Always indexed as `noindex`: a search results page is not content, and
 * letting crawlers enumerate `?q=` is how a site ends up with thousands of
 * junk URLs in an index.
 */
export const dynamic = 'force-dynamic';

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const { q } = parseCatalogSearchParams(await searchParams);

  return {
    title: q.length > 0 ? `חיפוש: ${q}` : 'חיפוש',
    robots: { index: false, follow: true },
    alternates: { canonical: '/search' },
  };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const rawSearchParams = await searchParams;
  const rawQuery = parseCatalogSearchParams(rawSearchParams);
  const term = rawQuery.q;

  if (term.length === 0) return <EmptyQuery />;

  const ranked = await postgresSearchProvider.searchProductIds(term);
  const rankedIds = ranked.map((hit) => hit.productId);

  return (
    <>
      <PageHero
        size="compact"
        title="חיפוש"
        trail={[{ label: 'דף הבית', href: '/' }, { label: 'חיפוש' }]}
        imageLabel="חיפוש"
      />

      <Container className="py-8 md:py-10">
        <SearchField term={term} />

        {/*
         * NOTHING FOUND IS SAID ONCE, without a filter bar over it. The bar
         * read "סינון" and "0 מוצרים" above the message - controls for a list
         * that does not exist (critique 2026-10-06). With nothing ranked there
         * is nothing to filter; the filtered-to-nothing case, where clearing a
         * filter is the way out, keeps the bar (CategoryResults).
         */}
        {rankedIds.length === 0 ? (
          <div className="mt-10">
            <NoResults term={term} />
          </div>
        ) : (
          <div className="mt-8">
            <Suspense fallback={<CategoryResultsSkeleton />}>
              <CategoryResults
                categoryIds={[]}
                filterConfig={{
                  facets: ['price', 'diamond_type', 'diamond_shape', 'carat', 'style'],
                }}
                basePath="/search"
                rawQuery={rawQuery}
                rankedIds={rankedIds}
                emptyState={<NoResults term={term} />}
              />
            </Suspense>
          </div>
        )}
      </Container>
    </>
  );
}

/** Arriving at /search with nothing typed. */
function EmptyQuery() {
  return (
    <>
      <PageHero
        size="compact"
        title="חיפוש"
        description="אפשר לחפש לפי שם דגם, סוג תכשיט, גוון זהב או צורת יהלום."
        trail={[{ label: 'דף הבית', href: '/' }, { label: 'חיפוש' }]}
        imageLabel="חיפוש"
      />

      <Container className="py-8 md:py-10">
        <SearchField />
        <div className="mt-10">
          <Suggestions heading={SEARCH_EXAMPLES_HEADING} />
        </div>
      </Container>
    </>
  );
}

/**
 * Zero results.
 *
 * NO PRODUCTS ARE FABRICATED and nothing is loosely substituted - showing
 * "similar" items a shopper did not ask for is how a search stops being
 * trustworthy. It says plainly that nothing matched, then offers three real
 * routes onward: clear the search, try a term that does exist, or browse a real
 * category.
 */
async function NoResults({ term }: { term: string }) {
  return (
    <div>
      <p className="text-base">
        לא מצאנו תוצאות עבור <bdi>&quot;{term}&quot;</bdi>.
      </p>
      <p className="text-muted-foreground mt-2 text-sm">
        אפשר לנסות מונח כללי יותר, לבדוק את האיות, או לעיין בקטגוריות.
      </p>

      <div className="mt-8">
        <Suggestions heading={SEARCH_RETRY_HEADING} />
      </div>
    </div>
  );
}

/** Example terms and real categories, both safe to offer. */

async function Suggestions({ heading }: { heading: string }) {
  // Categories come from the database, so a suggestion never points at a
  // category that does not exist.
  const categories = await getCategories();

  return (
    <div>
      <h2 className="text-muted-foreground text-xs font-medium">{heading}</h2>

      <ul className="mt-3 flex flex-wrap gap-2">
        {SEARCH_EXAMPLES.map((suggestion) => (
          <li key={suggestion}>
            <Link
              href={`/search?q=${encodeURIComponent(suggestion)}`}
              className="border-border hover:border-border-strong hover:bg-muted touch-target inline-flex h-9 items-center border px-4 text-sm transition-colors"
            >
              {suggestion}
            </Link>
          </li>
        ))}
      </ul>

      <h2 className="text-muted-foreground mt-8 text-xs font-medium">קטגוריות</h2>

      <ul className="mt-3 flex flex-wrap gap-2">
        {categories.map((category) => (
          <li key={category.id}>
            <Link
              href={category.href}
              className="border-border hover:border-border-strong hover:bg-muted touch-target inline-flex h-9 items-center border px-4 text-sm transition-colors"
            >
              {category.nameHe}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
