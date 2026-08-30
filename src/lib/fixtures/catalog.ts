import type { ProductCardData } from '@/components/product/types';
import { fromShekels } from '@/lib/money';

/**
 * DEVELOPMENT FIXTURES. Not real products, not real prices, not real stock.
 *
 * See ./README.md. These are consumed by routes only, never by components, and
 * are deleted when the catalog queries land.
 *
 * Names are plain descriptive Hebrew - "טבעת סוליטר" describes a solitaire
 * ring - rather than invented brand or collection names, which are TBD.
 */

/** Deliberately absent: `stockNotice`. Fixture stock would be a fabrication. */
export const FIXTURE_PRODUCTS: readonly ProductCardData[] = [
  {
    id: 'fx-1',
    slug: 'solitaire-ring',
    name: 'טבעת סוליטר יהלום מעבדה',
    price: fromShekels(4900),
    badges: ['best-seller'],
    imageAlt: 'טבעת סוליטר',
  },
  {
    id: 'fx-2',
    slug: 'tennis-bracelet',
    name: 'צמיד טניס יהלומים',
    price: fromShekels(7250),
    compareAtPrice: fromShekels(8400),
    badges: ['new'],
    imageAlt: 'צמיד טניס',
  },
  {
    id: 'fx-3',
    slug: 'name-necklace',
    name: 'שרשרת שם בעיצוב אישי',
    price: fromShekels(890),
    badges: ['made-to-order'],
    imageAlt: 'שרשרת שם',
  },
  {
    id: 'fx-4',
    slug: 'stud-earrings',
    name: 'עגילים צמודים יהלום',
    price: fromShekels(2150),
    imageAlt: 'עגילים צמודים',
  },
  {
    id: 'fx-5',
    slug: 'eternity-ring',
    name: 'טבעת איטרניטי זהב לבן',
    price: fromShekels(6300),
    badges: ['new', 'best-seller'],
    imageAlt: 'טבעת איטרניטי',
  },
  {
    id: 'fx-6',
    slug: 'pendant-necklace',
    name: 'שרשרת תליון יהלום עדין',
    price: fromShekels(1740),
    imageAlt: 'שרשרת תליון',
  },
  {
    id: 'fx-7',
    slug: 'hoop-earrings',
    name: 'עגילי חישוק זהב',
    price: fromShekels(1290),
    compareAtPrice: fromShekels(1550),
    imageAlt: 'עגילי חישוק',
  },
  {
    id: 'fx-8',
    slug: 'bridal-set',
    name: 'סט כלה טבעת ועגילים',
    price: fromShekels(11400),
    badges: ['made-to-order'],
    imageAlt: 'סט כלה',
  },
];

/**
 * Editorial copy for a category page.
 *
 * Kept short and factual. Real SEO copy per section 9 item 10 is a content task
 * that has not happened, so this describes the category rather than selling it.
 */
export interface FixtureCategory {
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly productCount: number;
}

export const FIXTURE_CATEGORIES: Readonly<Record<string, FixtureCategory>> = {
  rings: {
    slug: 'rings',
    title: 'טבעות',
    description:
      'טבעות אירוסין, נישואין וטבעות יומיום. כל היהלומים הם יהלומי מעבדה, וניתן להתאים כל דגם לפי קראט, גוון זהב ומידה.',
    productCount: FIXTURE_PRODUCTS.length,
  },
  earrings: {
    slug: 'earrings',
    title: 'עגילים',
    description: 'עגילים צמודים, חישוקים ועגילים תלויים בזהב ובשילוב יהלומי מעבדה.',
    productCount: FIXTURE_PRODUCTS.length,
  },
  necklaces: {
    slug: 'necklaces',
    title: 'שרשראות',
    description: 'שרשראות זהב, תליונים ושרשראות שם בעיצוב אישי.',
    productCount: FIXTURE_PRODUCTS.length,
  },
  bracelets: {
    slug: 'bracelets',
    title: 'צמידים',
    description: 'צמידי טניס, צמידי חוליות וצמידים עדינים לכל יום.',
    productCount: FIXTURE_PRODUCTS.length,
  },
  sets: {
    slug: 'sets',
    title: 'סטים',
    description: 'סטים תואמים של טבעות, עגילים ושרשראות, כולל סטים לכלה.',
    productCount: FIXTURE_PRODUCTS.length,
  },
};
