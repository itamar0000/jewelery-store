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

      {/* Unframed, for the same reason as the product grid and the category
          band: the picture is the object, and a hairline around it is one more
          rectangle competing with it. */}
      <ul className="grid gap-x-6 gap-y-10 md:grid-cols-3">
        {collections.slice(0, limit).map((collection) => (
          <li key={collection.id}>
            <Link href={collection.href} className="group block">
              <div className="bg-muted/50 overflow-hidden">
                <PlaceholderImage
                  ratio="landscape"
                  label={collection.nameHe}
                  className="transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                />
              </div>
              <div className="pt-4">
                <h3 className="group-hover:text-accent text-sm font-medium transition-colors">
                  {collection.nameHe}
                </h3>
                {collection.descriptionHe && (
                  <p className="text-muted-foreground mt-1.5 text-xs">{collection.descriptionHe}</p>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </Container>
  );
}
