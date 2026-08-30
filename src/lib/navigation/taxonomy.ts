/**
 * The storefront navigation taxonomy.
 *
 * THIS FILE IS THE SINGLE SOURCE OF NAVIGATION STRUCTURE. Header, mega menus,
 * mobile drawer, category pages and footer all read from here, so a label or a
 * link changes in one place and every surface follows.
 *
 * MASTER_SPECIFICATION section 5 lists the categories and section 6 the primary
 * navigation; section 6 also states the secondary taxonomy is example-level
 * ("Additional collections can be added later"), so this is deliberately data
 * rather than markup. Nothing here is a brand decision - the labels are the
 * documented Hebrew category names, not invented marketing copy.
 *
 * Hrefs point at routes that mostly do not exist yet. That is intentional for
 * Phase 3A: the information architecture is the deliverable, and later phases
 * fill in the routes without touching the components.
 */

/** A leaf link in any navigation surface. */
export interface NavLink {
  /** Stable identifier. Used for React keys and for menu open/close state. */
  readonly id: string;
  readonly label: string;
  readonly href: string;
}

/** A titled column inside a mega menu. */
export interface NavColumn {
  readonly id: string;
  /** Column heading. `null` renders the links with no heading. */
  readonly title: string | null;
  readonly links: readonly NavLink[];
}

/**
 * A promoted panel beside the mega menu columns.
 *
 * `image` is intentionally optional and currently unset everywhere: the
 * photography is TBD (MASTER_SPECIFICATION section 2 and 57) and inventing it
 * would be fabricating brand creative. When a real asset exists, setting the
 * field is the only change needed.
 */
export interface NavFeature {
  readonly title: string;
  readonly description: string;
  readonly href: string;
  readonly linkLabel: string;
  readonly image?: { readonly src: string; readonly alt: string };
}

/** A top-level navigation entry. Carries a mega menu when it has one. */
export interface NavItem {
  readonly id: string;
  readonly label: string;
  readonly href: string;
  readonly columns?: readonly NavColumn[];
  readonly feature?: NavFeature;
}

/**
 * Discovery links reused across several mega menus.
 *
 * Section 6 lists "New Arrivals / Best Sellers / relevant collections" as the
 * additional discovery column. Built per-category so each one deep-links into
 * its own scope rather than a single global page.
 */
function discoveryColumn(categorySlug: string): NavColumn {
  return {
    id: `${categorySlug}-discovery`,
    title: 'גילוי',
    links: [
      { id: `${categorySlug}-new`, label: 'חדש באתר', href: `/${categorySlug}?collection=new` },
      {
        id: `${categorySlug}-best`,
        label: 'רבי מכר',
        href: `/${categorySlug}?collection=best-sellers`,
      },
    ],
  };
}

/**
 * Primary navigation.
 *
 * Section 6 lists Rings, Earrings, Necklaces, Bracelets, Sets, Gifts, Custom
 * Jewelry and Guides / FAQ. Three deliberate departures, all owner decisions
 * recorded here so they are not mistaken for drift from the specification:
 *
 *   - GIFTS IS REMOVED for now. It is a merchandising surface with no products
 *     behind it yet, and an empty category is worse than an absent one. The
 *     `?collection=gifts` discovery links went with it. Restoring it is one
 *     entry here plus the discovery link.
 *   - GUIDES BECAME "שאלות ותשובות" at /faq. The section 33 educational topics
 *     are still unwritten; a question-and-answer page is the honest shape for
 *     what the store can actually answer today.
 *   - CONTACT IS ADDED as a primary item. Section 51 puts contact in the
 *     footer only, but a jewellery store that takes custom orders is asked
 *     questions before it is asked for a checkout.
 *
 * The five product categories carry mega menus; the rest are direct links,
 * because section 6 warns against overloading the navigation.
 */
export const PRIMARY_NAV: readonly NavItem[] = [
  {
    id: 'rings',
    label: 'טבעות',
    href: '/rings',
    columns: [
      {
        id: 'rings-categories',
        title: 'קטגוריות',
        links: [
          { id: 'rings-all', label: 'כל הטבעות', href: '/rings' },
          { id: 'rings-engagement', label: 'טבעות אירוסין', href: '/rings/engagement' },
          { id: 'rings-diamond', label: 'טבעות יהלומים', href: '/rings/diamond' },
          { id: 'rings-wedding', label: 'טבעות נישואין', href: '/rings/wedding' },
          { id: 'rings-gold', label: 'טבעות זהב', href: '/rings/gold' },
          {
            id: 'rings-colored',
            label: 'טבעות עם יהלומים צבעוניים',
            href: '/rings/colored-diamonds',
          },
        ],
      },
      discoveryColumn('rings'),
    ],
    feature: {
      title: 'אוסף האירוסין',
      description: 'טבעות אירוסין ביהלומי מעבדה, בהתאמה אישית מלאה.',
      href: '/rings/engagement',
      linkLabel: 'לצפייה באוסף',
    },
  },
  {
    id: 'earrings',
    label: 'עגילים',
    href: '/earrings',
    columns: [
      {
        id: 'earrings-categories',
        title: 'קטגוריות',
        links: [
          { id: 'earrings-all', label: 'כל העגילים', href: '/earrings' },
          { id: 'earrings-diamond', label: 'עגילי יהלום', href: '/earrings/diamond' },
          { id: 'earrings-hoop', label: 'עגילי חישוק', href: '/earrings/hoop' },
          { id: 'earrings-drop', label: 'עגילים תלויים', href: '/earrings/drop' },
          { id: 'earrings-stud', label: 'עגילים צמודים', href: '/earrings/stud' },
        ],
      },
      discoveryColumn('earrings'),
    ],
  },
  {
    id: 'necklaces',
    label: 'שרשראות',
    href: '/necklaces',
    columns: [
      {
        id: 'necklaces-categories',
        title: 'קטגוריות',
        links: [
          { id: 'necklaces-all', label: 'כל השרשראות', href: '/necklaces' },
          { id: 'necklaces-gold', label: 'שרשראות זהב', href: '/necklaces/gold' },
          { id: 'necklaces-diamond', label: 'שרשראות יהלומים', href: '/necklaces/diamond' },
          { id: 'necklaces-pendants', label: 'תליונים', href: '/necklaces/pendants' },
          { id: 'necklaces-name', label: 'שרשראות שם', href: '/necklaces/name' },
          { id: 'necklaces-photo', label: 'שרשראות תמונה', href: '/necklaces/photo' },
        ],
      },
      discoveryColumn('necklaces'),
    ],
  },
  {
    id: 'bracelets',
    label: 'צמידים',
    href: '/bracelets',
    columns: [
      {
        id: 'bracelets-categories',
        title: 'קטגוריות',
        links: [
          { id: 'bracelets-all', label: 'כל הצמידים', href: '/bracelets' },
          { id: 'bracelets-tennis', label: 'צמידי טניס', href: '/bracelets/tennis' },
          { id: 'bracelets-diamond', label: 'צמידי יהלומים', href: '/bracelets/diamond' },
          { id: 'bracelets-gold', label: 'צמידי זהב', href: '/bracelets/gold' },
          { id: 'bracelets-delicate', label: 'צמידים עדינים', href: '/bracelets/delicate' },
          { id: 'bracelets-link', label: 'צמידי חוליות', href: '/bracelets/link' },
        ],
      },
      discoveryColumn('bracelets'),
    ],
  },
  {
    id: 'sets',
    label: 'סטים',
    href: '/sets',
    columns: [
      {
        id: 'sets-categories',
        title: 'קטגוריות',
        links: [
          { id: 'sets-all', label: 'כל הסטים', href: '/sets' },
          { id: 'sets-ring-earrings', label: 'טבעת ועגילים', href: '/sets/ring-earrings' },
          {
            id: 'sets-necklace-earrings',
            label: 'שרשרת ועגילים',
            href: '/sets/necklace-earrings',
          },
          { id: 'sets-bridal', label: 'סטים לכלה', href: '/sets/bridal' },
          { id: 'sets-gift', label: 'סטי מתנה', href: '/sets/gift' },
        ],
      },
      discoveryColumn('sets'),
    ],
  },
  { id: 'custom', label: 'עיצוב אישי', href: '/custom' },
  { id: 'faq', label: 'שאלות ותשובות', href: '/faq' },
  { id: 'contact', label: 'צור קשר', href: '/contact' },
];

/**
 * Footer columns, per MASTER_SPECIFICATION section 51.
 *
 * Contact details live in `FOOTER_CONTACT` and are placeholders: the business
 * phone, address and support channels are TBD (section 52, TBD.md). Inventing a
 * phone number would put a fake business detail in front of customers.
 */
export interface FooterColumn {
  readonly id: string;
  readonly title: string;
  readonly links: readonly NavLink[];
}

export const FOOTER_COLUMNS: readonly FooterColumn[] = [
  {
    id: 'shop',
    title: 'חנות',
    links: [
      { id: 'f-rings', label: 'טבעות', href: '/rings' },
      { id: 'f-earrings', label: 'עגילים', href: '/earrings' },
      { id: 'f-necklaces', label: 'שרשראות', href: '/necklaces' },
      { id: 'f-bracelets', label: 'צמידים', href: '/bracelets' },
      { id: 'f-sets', label: 'סטים', href: '/sets' },
    ],
  },
  {
    id: 'services',
    title: 'שירות',
    links: [
      { id: 'f-custom', label: 'עיצוב אישי', href: '/custom' },
      { id: 'f-shipping', label: 'משלוחים', href: '/shipping' },
      { id: 'f-returns', label: 'החזרות', href: '/returns' },
      { id: 'f-warranty', label: 'אחריות', href: '/warranty' },
      { id: 'f-faq', label: 'שאלות ותשובות', href: '/faq' },
    ],
  },
  {
    id: 'about',
    title: 'אודות',
    links: [
      { id: 'f-about', label: 'עלינו', href: '/about' },
      { id: 'f-contact', label: 'צור קשר', href: '/contact' },
    ],
  },
  {
    id: 'legal',
    title: 'מידע משפטי',
    links: [
      { id: 'f-terms', label: 'תנאי שימוש', href: '/legal/terms' },
      { id: 'f-privacy', label: 'מדיניות פרטיות', href: '/legal/privacy' },
      { id: 'f-accessibility', label: 'הצהרת נגישות', href: '/legal/accessibility' },
    ],
  },
];

/**
 * Contact channels for the footer.
 *
 * PLACEHOLDER. `href: null` renders the channel as inert text with a "TBD"
 * note rather than a dead link, so nobody mistakes it for a working contact
 * route. Section 52 lists these as outstanding business details.
 */
export interface ContactChannel {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly href: string | null;
}

export const FOOTER_CONTACT: readonly ContactChannel[] = [
  { id: 'whatsapp', label: 'וואטסאפ', value: 'יעודכן', href: null },
  { id: 'email', label: 'דוא"ל', value: 'יעודכן', href: null },
  { id: 'phone', label: 'טלפון', value: 'יעודכן', href: null },
];
