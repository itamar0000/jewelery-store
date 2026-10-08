import Link from 'next/link';
import { Suspense } from 'react';

import { CategoryResults, CategoryResultsSkeleton } from '@/components/category/CategoryResults';
import { ProductPhoto } from '@/components/product/ProductPhoto';
import { Container } from '@/components/ui/Container';
import type { RawCatalogQuery } from '@/lib/catalog/filters';
import { countOf } from '@/lib/i18n/count';

import { EditorialPanel } from './EditorialPanel';
import { Hero } from './Hero';

const MODELS = { one: 'דגם אחד', other: 'דגמים' } as const;

/**
 * The men's department landing, /men (D4D.34).
 *
 * THE SAME ATELIER, ON THE GREEN. The site's grammar - the curved hero, the
 * arches, the split bands - opened on the forest-green field rather than the
 * ivory, so the department reads as its own room of the same house. No black
 * and gold: the brand rules that shorthand out (PRODUCT.md).
 *
 *   opening     the line and two pills on the green, the photograph curved
 *   kinds       one arch per men's category, its own first piece in it
 *   wedding     bands for both of you, beside their photograph
 *   engraving   the signet and its initials, on the green field
 *   catalogue   every men's piece, with the category's filters and sorting
 *
 * EVERY CLAIM IS PRODUCT.md'S: 14K, made after the order in the owner's own
 * workshop, and the alteration axes that exist - gold colour, size, length,
 * engraving. The kinds are read from the database, so a category with no
 * piece yet has no arch.
 */
export interface MenKind {
  readonly id: string;
  readonly label: string;
  readonly href: string;
  readonly count: number;
  readonly imageUrl: string | null;
  readonly imageAlt: string;
}

export function MenDepartment({
  kinds,
  categoryIds,
  filterConfig,
  basePath,
  rawQuery,
}: {
  kinds: readonly MenKind[];
  categoryIds: readonly string[];
  filterConfig: unknown;
  basePath: string;
  rawQuery: RawCatalogQuery;
}) {
  return (
    <>
      <Hero
        lead="תכשיטי זהב"
        emphasis="לגבר"
        tail=""
        body="טבעות חותם, טבעות נישואין, שרשראות וצמידים בזהב 14K. כל תכשיט מיוצר אחרי ההזמנה בסדנה שלנו, ואפשר לבחור גוון זהב, מידה, אורך וחריטה."
        primary={{ label: 'לכל התכשיטים לגבר', href: '#men-catalogue' }}
        secondary={{ label: 'עיצוב בהתאמה אישית', href: '/custom' }}
        imageLabel="תכשיטים לגבר"
        assetId="men-hero"
        tone="field"
        compact
      />

      {kinds.length > 0 && (
        <Container
          as="section"
          aria-labelledby="men-kinds-heading"
          className="py-section md:py-feature"
          width="wide"
        >
          <h2
            id="men-kinds-heading"
            className="font-display mb-10 text-4xl leading-[1.1] font-normal text-balance md:text-5xl"
          >
            לפי סוג תכשיט
          </h2>
          {/*
           * ARCHES, as on the home page - here each holds the category's own
           * first piece, so the picture is always something one can order.
           */}
          <ul className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4 lg:gap-x-5">
            {kinds.map((kind) => (
              <li key={kind.id}>
                <Link href={kind.href} className="group block">
                  <div className="bg-muted relative overflow-hidden rounded-t-full">
                    <ProductPhoto
                      url={kind.imageUrl}
                      alt={kind.imageAlt}
                      ratio="portrait"
                      sizes="(width >= 64rem) 23vw, 48vw"
                      className="ease-settle transition-transform duration-(--duration-drift) group-hover:scale-[1.04] motion-reduce:group-hover:scale-100"
                    />
                  </div>
                  <span className="font-display group-hover:text-accent mt-4 block text-center text-[1.375rem] leading-tight transition-colors">
                    {kind.label}
                  </span>
                  <span className="text-muted-foreground mt-1 block text-center text-sm">
                    {countOf(kind.count, MODELS)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      )}

      <EditorialPanel
        id="men-wedding-heading"
        title="טבעות נישואין לשניכם"
        body="טבעות הנישואין מיוצרות בזהב 14K בגוון ובמידה של כל אחד מכם. אפשר להזמין זוג תואם, ולבקש חריטה בתוך הטבעת."
        action={{ label: 'לטבעות הנישואין לגבר', href: '/men/men-wedding-rings' }}
        imageSide="start"
        tone="muted"
        assetId="men-wedding"
        imageLabel="טבעות נישואין"
      />

      <EditorialPanel
        id="men-engraving-heading"
        title="ראשי תיבות על החותם"
        body="על טבעת החותם אפשר לחרוט ראשי תיבות, תאריך או סמל. כמו כל דגם באתר, גם אותה מתאימים לפי בקשה, כי היא מיוצרת אחרי ההזמנה."
        action={{ label: 'לבקשה לעיצוב אישי', href: '/custom' }}
        imageSide="end"
        tone="field"
        assetId="men-engraving"
        imageLabel="טבעת חותם"
      />

      <Container
        as="section"
        aria-labelledby="men-catalogue"
        className="py-section md:py-feature"
        width="wide"
      >
        {/* The hero's first action lands here; the margin clears the sticky header. */}
        <h2
          id="men-catalogue"
          className="font-display mb-8 scroll-mt-[calc(var(--header-height)+1rem)] text-4xl leading-[1.1] font-normal text-balance md:text-5xl"
        >
          כל התכשיטים לגבר
        </h2>
        <Suspense fallback={<CategoryResultsSkeleton />}>
          <CategoryResults
            categoryIds={categoryIds}
            filterConfig={filterConfig}
            basePath={basePath}
            rawQuery={rawQuery}
            department="men"
          />
        </Suspense>
      </Container>
    </>
  );
}
