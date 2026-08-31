/**
 * THE PLACEHOLDER REGISTRY.
 *
 * Phase 3A builds the storefront shell ahead of the systems behind it. Several
 * controls therefore look finished but do nothing yet. The risk that creates is
 * a placeholder quietly surviving into production because nobody remembered it
 * was one.
 *
 * Every temporary surface in the storefront is listed here and marks itself in
 * the DOM with `data-placeholder`, so the full set is greppable from source and
 * queryable from a running page:
 *
 *     grep -rn "PLACEHOLDER_ATTR\|data-placeholder" src/
 *     document.querySelectorAll('[data-placeholder]')
 *
 * When a system lands, delete its entry here and the attribute at the call
 * site. When this file is empty, the shell is fully wired.
 */

/**
 * Spread onto the root element of any not-yet-functional control.
 *
 * `data-*` rather than a class: it carries no styling, survives minification,
 * and is invisible to the accessibility tree, so it cannot change what a
 * screen-reader user hears.
 */
export const PLACEHOLDER_ATTR = { 'data-placeholder': 'true' } as const;

/**
 * What is still a placeholder, and which phase replaces it.
 *
 * Kept as data rather than prose so it can be asserted against in a test - if
 * someone adds a placeholder without registering it, that is a review comment,
 * not a silent omission.
 */
export interface PlaceholderEntry {
  readonly id: string;
  readonly what: string;
  readonly replacedBy: string;
}

export const PLACEHOLDERS: readonly PlaceholderEntry[] = [
  {
    id: 'search',
    what: 'Search overlay renders popular-search chips and a non-submitting field. No query runs.',
    replacedBy: 'Phase 3B - SearchProvider port and Postgres trigram search.',
  },
  {
    id: 'wishlist',
    what: 'Wishlist buttons are inert toggles with no persistence. Header count is omitted, not zeroed.',
    replacedBy: 'Phase 6 - accounts and saved items.',
  },
  {
    id: 'cart',
    what: 'Cart control links to a placeholder route. No line items, no totals, no badge count.',
    replacedBy: 'Phase 5 - cart and checkout.',
  },
  {
    id: 'account',
    what: 'Account control links to a placeholder route. No authentication exists.',
    replacedBy: 'Phase 6 - authentication.',
  },
  {
    id: 'filters',
    what: 'Filter and sort controls render their full visual architecture but do not filter or sort. Opened from the toolbar; closed by default.',
    replacedBy: 'Phase 3B - URL-driven filter state against real queries.',
  },
  {
    id: 'contact',
    what: 'Contact page lists channels with no values and no form. Nothing is collected and nothing is sent.',
    replacedBy: 'Business details (TBD section 52) plus an enquiry inbox.',
  },
  {
    id: 'variant-form',
    what: 'Product page renders real variants, prices and stock, but the personalization fields are display-only and Add to cart is disabled.',
    replacedBy: 'Phase 4 - product experience; Phase 5 - cart.',
  },
  {
    id: 'imagery',
    what: 'ProductImage rows are real - real alt text, real ordering, real variant association - but no storage provider is configured, so resolveImageUrl returns null and every image renders as a tonal placeholder.',
    replacedBy: 'A storage provider (TBD.md I1) plus brand photography (section 2 and 57).',
  },
];
