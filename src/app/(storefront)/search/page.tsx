import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';

import { CategoryResults, CategoryResultsSkeleton } from '@/components/category/CategoryResults';
import { PageHero } from '@/components/storefront/PageHero';
import { Container } from '@/components/ui/Container';
import { parseCatalogSearchParams, type SearchParams } from '@/lib/catalog/filters';
import { getCategories } from '@/lib/catalog/queries';
import { postgresSearchProvider } from '@/lib/search';

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
        title={`תוצאות חיפוש`}
        description={`חיפשת: "${term}"`}
        trail={[{ label: 'דף הבית', href: '/' }, { label: 'חיפוש' }]}
        imageLabel="חיפוש"
      />

      <Container className="py-8 md:py-10">
        <Suspense key={JSON.stringify(rawSearchParams)} fallback={<CategoryResultsSkeleton />}>
          <CategoryResults
            categoryIds={[]}
            filterConfig={{ facets: ['price', 'gold_karat', 'gold_color', 'style'] }}
            basePath="/search"
            rawQuery={rawQuery}
            rankedIds={rankedIds}
            emptyState={<NoResults term={term} />}
          />
        </Suspense>
      </Container>
    </>
  );
}

/** Arriving at /search with nothing typed. */
function EmptyQuery() {
  return (
    <>
      <PageHero
        title="חיפוש"
        description="אפשר לחפש לפי שם דגם, סוג תכשיט, גוון זהב או צורת יהלום."
        trail={[{ label: 'דף הבית', href: '/' }, { label: 'חיפוש' }]}
        imageLabel="חיפוש"
      />

      <Container className="py-12 md:py-16">
        <Suggestions heading="חיפושים נפוצים" />
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
    <div className="border-border rounded-sm border border-dashed px-6 py-16 text-center">
      <p className="text-base">לא מצאנו תוצאות עבור &quot;{term}&quot;.</p>
      <p className="text-muted-foreground mt-2 text-sm">
        אפשר לנסות מונח כללי יותר, לבדוק את האיות, או לעיין בקטגוריות.
      </p>

      <Link
        href="/search"
        className="border-border-strong hover:bg-muted mt-6 inline-flex h-11 items-center rounded-sm border px-5 text-sm transition-colors"
      >
        ניקוי החיפוש
      </Link>

      <div className="mt-10">
        <Suggestions heading="אולי התכוונת" />
      </div>
    </div>
  );
}

/** Suggested terms and real categories, both safe to offer. */
const SUGGESTED_TERMS = ['טבעת אירוסין', 'צמיד טניס', 'עגילי יהלום', 'שרשרת שם', 'זהב לבן'];

async function Suggestions({ heading }: { heading: string }) {
  // Categories come from the database, so a suggestion never points at a
  // category that does not exist.
  const categories = await getCategories();

  return (
    <div>
      <h2 className="text-muted-foreground text-2xs font-medium">{heading}</h2>

      <ul className="mt-3 flex flex-wrap justify-center gap-2">
        {SUGGESTED_TERMS.map((suggestion) => (
          <li key={suggestion}>
            <Link
              href={`/search?q=${encodeURIComponent(suggestion)}`}
              className="border-border hover:border-border-strong hover:bg-muted inline-flex h-9 items-center rounded-full border px-4 text-sm transition-colors"
            >
              {suggestion}
            </Link>
          </li>
        ))}
      </ul>

      <h2 className="text-muted-foreground text-2xs mt-8 font-medium">קטגוריות</h2>

      <ul className="mt-3 flex flex-wrap justify-center gap-2">
        {categories.map((category) => (
          <li key={category.id}>
            <Link
              href={category.href}
              className="border-border hover:border-border-strong hover:bg-muted inline-flex h-9 items-center rounded-full border px-4 text-sm transition-colors"
            >
              {category.nameHe}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
