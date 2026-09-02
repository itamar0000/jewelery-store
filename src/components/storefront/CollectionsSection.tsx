import Link from 'next/link';

import { Container } from '@/components/ui/Container';
import { PlaceholderImage } from '@/components/ui/PlaceholderImage';
import type { CollectionSummary } from '@/lib/catalog/types';

import { SectionHeading } from './SectionHeading';

/**
 * Featured collections.
 *
 * MASTER_SPECIFICATION section 28: collections exist INDEPENDENTLY of the
 * product categories. They now come from the database - names, descriptions and
 * links are real rows, not the hard-coded list this component used to carry.
 *
 * Collections are PASSED IN by the route. This component does not query,
 * which keeps it renderable from anywhere and keeps the data boundary in
 * `src/lib/catalog`.
 *
 * Renders nothing when there are no collections, rather than an empty band
 * under a heading.
 */
export function CollectionsSection({
  collections,
  limit = 3,
}: {
  collections: readonly CollectionSummary[];
  limit?: number;
}) {
  if (collections.length === 0) return null;

  return (
    <Container as="section" aria-labelledby="collections-heading" className="py-section">
      <SectionHeading
        id="collections-heading"
        title="אוספים"
        description="אוספים נבנים בנפרד מהקטגוריות ומתעדכנים לאורך השנה."
      />

      {/*
       * TALL TILES WITH THE COPY OVER THE IMAGE.
       *
       * This is the third browse band on the homepage, after the category grid
       * and the best-seller rail, and the visual pass found all three built the
       * same way: centred heading, one row, caption under each picture. Three
       * identical structures in a row is what made the page read as a template.
       *
       * So each band now states itself differently - the category grid is
       * asymmetric with overlaid labels, the product rail is captioned below,
       * and a collection is a tall portrait with its name and description laid
       * over the bottom of the frame. A collection is a mood rather than a
       * SKU, and copy on the image is the form that says so.
       */}
      <ul className="grid gap-4 md:grid-cols-3">
        {collections.slice(0, limit).map((collection) => (
          <li key={collection.id}>
            <Link href={collection.href} className="group block">
              <div className="relative overflow-hidden">
                <PlaceholderImage
                  ratio="tall"
                  label={collection.nameHe}
                  className="transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                />

                <div
                  aria-hidden="true"
                  className="from-foreground/70 absolute inset-0 bg-gradient-to-t via-transparent to-transparent"
                />

                <div className="text-background absolute inset-x-0 bottom-0 p-5 md:p-6">
                  <h3 className="text-base font-medium md:text-lg">{collection.nameHe}</h3>
                  {collection.descriptionHe && (
                    <p className="text-background/75 mt-1.5 text-xs text-pretty">
                      {collection.descriptionHe}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </Container>
  );
}
