/**
 * Category-aware filter configuration.
 *
 * MASTER_SPECIFICATION section 10 is explicit that filters are CATEGORY-AWARE
 * and that irrelevant filters must not be displayed - a ring size control on a
 * necklace page is a defect, not a harmless extra.
 *
 * The filters are therefore described GENERICALLY, as data, and each category
 * names the ones it uses. That has two consequences worth stating:
 *
 *   1. The FilterPanel renders whatever it is handed and knows nothing about
 *      rings or necklaces. No component contains a category conditional.
 *   2. This module is a stand-in for `Category.filterConfig` in the database
 *      (DATA_MODEL, and the Phase 3 plan entry). When that column is populated,
 *      this file is deleted and the same shape arrives from a query - the panel
 *      does not change.
 *
 * Section 10 closes with "Final filter list: TBD during implementation", so the
 * option values below are structural examples, not a settled merchandising
 * decision.
 *
 * NO FILTERING LOGIC LIVES HERE. Phase 3A builds the visual architecture only;
 * applying filters is URL-driven work in Phase 3B.
 */

export type FilterKind = 'range' | 'options' | 'swatch';

export interface FilterOption {
  readonly id: string;
  readonly label: string;
  /** Swatch colour, as a CSS colour. Only meaningful for `swatch` filters. */
  readonly swatch?: string;
}

export interface FilterDefinition {
  readonly id: string;
  readonly label: string;
  readonly kind: FilterKind;
  readonly options?: readonly FilterOption[];
  /** Range filters only. Agorot, matching the money module. */
  readonly min?: number;
  readonly max?: number;
}

/** Every filter the storefront knows how to render. */
const FILTERS: Readonly<Record<string, FilterDefinition>> = {
  price: { id: 'price', label: 'מחיר', kind: 'range', min: 0, max: 2_000_000 },

  karat: {
    id: 'karat',
    label: 'קראט זהב',
    kind: 'options',
    options: [
      { id: '14k', label: '14K' },
      { id: '18k', label: '18K' },
    ],
  },

  goldColor: {
    id: 'goldColor',
    label: 'גוון זהב',
    kind: 'swatch',
    // Swatch colours describe the physical metal and are not brand palette
    // values, which is why they are literals rather than design tokens.
    options: [
      { id: 'yellow', label: 'זהב צהוב', swatch: '#d9b26a' },
      { id: 'white', label: 'זהב לבן', swatch: '#dcdcdc' },
      { id: 'rose', label: 'זהב אדום', swatch: '#d6a08a' },
    ],
  },

  diamondShape: {
    id: 'diamondShape',
    label: 'צורת יהלום',
    kind: 'options',
    options: [
      { id: 'round', label: 'Round' },
      { id: 'oval', label: 'Oval' },
      { id: 'princess', label: 'Princess' },
      { id: 'emerald', label: 'Emerald' },
      { id: 'pear', label: 'Pear' },
    ],
  },

  carat: {
    id: 'carat',
    label: 'משקל קראט',
    kind: 'options',
    options: [
      { id: '0-0.5', label: 'עד 0.5' },
      { id: '0.5-1', label: '0.5 - 1' },
      { id: '1-2', label: '1 - 2' },
      { id: '2+', label: '2 ומעלה' },
    ],
  },

  ringSize: {
    id: 'ringSize',
    label: 'מידת טבעת',
    kind: 'options',
    options: [
      { id: '5', label: '5' },
      { id: '6', label: '6' },
      { id: '7', label: '7' },
      { id: '8', label: '8' },
      { id: '9', label: '9' },
    ],
  },

  length: {
    id: 'length',
    label: 'אורך',
    kind: 'options',
    options: [
      { id: '40', label: '40 ס״מ' },
      { id: '45', label: '45 ס״מ' },
      { id: '50', label: '50 ס״מ' },
    ],
  },

  style: {
    id: 'style',
    label: 'סגנון',
    kind: 'options',
    options: [
      { id: 'classic', label: 'קלאסי' },
      { id: 'modern', label: 'מודרני' },
      { id: 'delicate', label: 'עדין' },
      { id: 'statement', label: 'בולט' },
    ],
  },
};

/**
 * Which filters each category shows, per section 10.
 *
 * Ring filters include size, shape and carat; necklaces and bracelets get
 * length instead of size; earrings get neither.
 */
const CATEGORY_FILTERS: Readonly<Record<string, readonly string[]>> = {
  rings: ['price', 'karat', 'goldColor', 'diamondShape', 'carat', 'ringSize', 'style'],
  earrings: ['price', 'karat', 'goldColor', 'diamondShape', 'style'],
  necklaces: ['price', 'karat', 'goldColor', 'length', 'style'],
  bracelets: ['price', 'karat', 'goldColor', 'length', 'style'],
  sets: ['price', 'karat', 'goldColor', 'style'],
};

/**
 * Filters for a category.
 *
 * An unknown category falls back to the shared filters rather than throwing -
 * a new category should render a usable page before anyone configures it.
 */
export function filtersForCategory(categorySlug: string): readonly FilterDefinition[] {
  const ids = CATEGORY_FILTERS[categorySlug] ?? ['price', 'karat', 'goldColor', 'style'];
  return ids
    .map((id) => FILTERS[id])
    .filter((filter): filter is FilterDefinition => Boolean(filter));
}

/** Sort options. Ordering is applied in Phase 3B; these name the intent. */
export const SORT_OPTIONS: readonly FilterOption[] = [
  { id: 'relevance', label: 'רלוונטיות' },
  { id: 'price-asc', label: 'מחיר: מהנמוך לגבוה' },
  { id: 'price-desc', label: 'מחיר: מהגבוה לנמוך' },
  { id: 'newest', label: 'הכי חדש' },
];
