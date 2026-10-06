import Link from 'next/link';

import { Container } from '@/components/ui/Container';
import { cn } from '@/components/ui/cn';
import { EditorialImage } from '@/components/ui/EditorialImage';
import type { EditorialAssetId } from '@/lib/content/editorial-assets';
import type { CollectionSummary } from '@/lib/catalog/types';

import { SectionHeading } from './SectionHeading';

/**
 * Which picture belongs to which collection.
 *
 * Keyed by SLUG rather than by position, so reordering the collections in the
 * admin cannot silently hand the bridal photograph to "new arrivals". A
 * collection with no entry here simply renders without a picture, which is the
 * state every one of them was in until the photography existed.
 */
const COLLECTION_IMAGE: Readonly<Record<string, EditorialAssetId>> = {
  'new-arrivals': 'collection-new-arrivals',
  'best-sellers': 'collection-best-sellers',
  bridal: 'collection-bridal',
  personalized: 'collection-personalized',
};

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
 *
 * The homepage passes only the collections without a band of their own: best
 * sellers has its product rail and bridal its full-bleed band, and listing
 * them again here is how "רבי מכר" came to appear twice on one page.
 */
export function CollectionsSection({
  collections,
  limit = 4,
}: {
  collections: readonly CollectionSummary[];
  limit?: number;
}) {
  const shown = collections.slice(0, limit);
  if (shown.length === 0) return null;

  return (
    <Container as="section" aria-labelledby="collections-heading" className="py-section">
      <SectionHeading
        id="collections-heading"
        title="אוספים"
        description="דגמים מהקטלוג, מקובצים לפי נושא."
      />

      {/*
       * ONE ROW, NOT A RUN OF BANDS.
       *
       * It has been three things. Tall tiles with the name over a scrim; then a
       * ruled index of names, while there was no photography; then, once
       * there was, a run of four full-measure bands at alternating offsets -
       * which the critique measured at 36% of the homepage for four links,
       * longer than every product on it. A collection is an index entry, not
       * an occasion: the photograph and its name on a rule, side by side, the
       * still lifes distinct from the worn shots of the category tiles above.
       * Two to a row (three when there are three), stacked on a phone.
       */}
      <ul
        className={cn(
          'mt-10 grid gap-x-8 gap-y-12 md:mt-14',
          shown.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2',
        )}
      >
        {shown.map((collection) => {
          const assetId = COLLECTION_IMAGE[collection.slug];

          return (
            <li key={collection.id}>
              <Link href={collection.href} className="group block">
                {assetId && (
                  <div className="relative aspect-[3/2] w-full overflow-hidden">
                    <EditorialImage
                      id={assetId}
                      sizes="(min-width: 768px) 45vw, 100vw"
                      placeholderLabel={collection.nameHe}
                      className="ease-settle transition-transform duration-(--duration-drift) group-hover:scale-[1.03] motion-reduce:group-hover:scale-100"
                    />
                  </div>
                )}

                <div className="border-border mt-5 flex flex-wrap items-baseline gap-x-6 gap-y-2 border-t pt-5">
                  <h3 className="font-display text-2xl font-bold tracking-tight">
                    {collection.nameHe}
                  </h3>

                  {collection.descriptionHe && (
                    <p className="text-muted-foreground max-w-md text-sm text-pretty">
                      {collection.descriptionHe}
                    </p>
                  )}

                  <span className="decoration-border-strong group-hover:decoration-foreground ms-auto text-sm font-semibold underline underline-offset-[0.4em]">
                    לצפייה
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </Container>
  );
}
