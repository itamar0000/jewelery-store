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
    <Container as="section" aria-labelledby="collections-heading" className="py-16 md:py-20">
      <SectionHeading
        id="collections-heading"
        title="אוספים"
        description="אוספים נבנים בנפרד מהקטגוריות ומתעדכנים לאורך השנה."
      />

      <ul className="grid gap-4 md:grid-cols-3">
        {collections.slice(0, limit).map((collection) => (
          <li key={collection.id}>
            <Link
              href={collection.href}
              className="group border-border bg-card hover:border-border-strong block overflow-hidden rounded-sm border transition-colors"
            >
              <PlaceholderImage
                ratio="landscape"
                label={collection.nameHe}
                className="transition-transform duration-500 group-hover:scale-[1.03]"
              />
              <div className="p-5">
                <h3 className="group-hover:text-accent text-sm font-medium transition-colors">
                  {collection.nameHe}
                </h3>
                {collection.descriptionHe && (
                  <p className="text-muted-foreground mt-1 text-xs">{collection.descriptionHe}</p>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </Container>
  );
}
