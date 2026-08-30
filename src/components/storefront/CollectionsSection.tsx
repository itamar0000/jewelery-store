import Link from 'next/link';

import { Container } from '@/components/ui/Container';
import { PlaceholderImage } from '@/components/ui/PlaceholderImage';

import { SectionHeading } from './SectionHeading';

/**
 * Featured collections.
 *
 * MASTER_SPECIFICATION section 28: collections exist INDEPENDENTLY of the
 * product categories - New Arrivals, Best Sellers, Bridal, Everyday,
 * Personalized, Diamond, seasonal. This section surfaces a few of them.
 *
 * The three shown here are the durable ones from that list. Seasonal
 * collections are deliberately absent: they are a merchandising decision that
 * nobody has made, and inventing "Summer Collection" would be fabricating a
 * campaign.
 *
 * Collections currently link into category routes with a `collection` query
 * parameter, matching the taxonomy. Real collection routes arrive with the
 * catalog work.
 */
const COLLECTIONS: readonly { id: string; label: string; href: string; note: string }[] = [
  { id: 'new', label: 'חדש באתר', href: '/rings?collection=new', note: 'הדגמים האחרונים שנוספו' },
  {
    id: 'bridal',
    label: 'אוסף הכלה',
    href: '/sets/bridal',
    note: 'טבעות אירוסין, נישואין וסטים תואמים',
  },
  {
    id: 'personalized',
    label: 'עיצוב אישי',
    href: '/custom',
    note: 'חריטה, שמות ותכשיטים בהזמנה',
  },
];

export function CollectionsSection() {
  return (
    <Container as="section" aria-labelledby="collections-heading" className="py-16 md:py-20">
      <SectionHeading
        id="collections-heading"
        title="אוספים"
        description="אוספים נבנים בנפרד מהקטגוריות ומתעדכנים לאורך השנה."
      />

      <ul className="grid gap-4 md:grid-cols-3">
        {COLLECTIONS.map((collection) => (
          <li key={collection.id}>
            <Link
              href={collection.href}
              className="group border-border bg-card hover:border-border-strong block overflow-hidden rounded-sm border transition-colors"
            >
              <PlaceholderImage
                ratio="landscape"
                label={collection.label}
                className="transition-transform duration-500 group-hover:scale-[1.03]"
              />
              <div className="p-5">
                <h3 className="group-hover:text-accent text-sm font-medium transition-colors">
                  {collection.label}
                </h3>
                <p className="text-muted-foreground mt-1 text-xs">{collection.note}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </Container>
  );
}
