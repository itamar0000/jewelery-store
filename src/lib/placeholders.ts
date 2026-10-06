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
    id: 'wishlist',
    what: 'Withheld: no heart on cards or the product page, no header or drawer link, and /wishlist is a 404. WishlistButton (the accessible toggle, local state only) is kept, unrendered.',
    replacedBy: 'Phase 6 - accounts and saved items.',
  },
  {
    id: 'payment',
    what: 'The checkout is real up to payment: orders are placed as PENDING_PAYMENT with their stock held, and /checkout/payment states that payment is not active and nothing was charged. getPaymentProvider() returns null.',
    replacedBy:
      'TBD B1 - a payment provider adapter and its webhook (src/lib/payments/provider.ts lists the steps).',
  },
  {
    id: 'account',
    what: 'Withheld: no header or drawer link, and /account is a 404. No authentication exists.',
    replacedBy: 'Phase 6 - authentication.',
  },
  {
    id: 'contact',
    what: 'Contact is configuration (CONTACT_* env, src/lib/contact). With no channel set, the nav item, footer column, product-page prompt and FAQ line are hidden and /contact is a 404. There is no enquiry form; nothing is collected.',
    replacedBy: 'Business details (TBD section 52) plus an enquiry inbox.',
  },
  {
    id: 'imagery',
    what: 'The storage layer is built and tested (src/lib/media), but no bucket is provisioned, so resolveImageUrl returns null and images render as a tonal placeholder. ProductImage rows are real throughout - alt text, ordering, variant association.',
    replacedBy:
      'MEDIA_S3_* credentials (see docs/MEDIA_STORAGE_DECISION.md) plus brand photography (section 2 and 57).',
  },
];
