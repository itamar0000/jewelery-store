import { notFound } from 'next/navigation';

/**
 * Wishlist.
 *
 * A 404 UNTIL SAVING IS REAL. Nothing links here: the hearts on cards and on
 * the product page, and the header and drawer links, were withheld together
 * (src/lib/placeholders.ts, `wishlist`). This page used to explain that a heart
 * pressed elsewhere was not kept - an apology for a control that no longer
 * renders. Phase 6 builds saved items, and the page with them.
 */
export default function WishlistPage() {
  notFound();
}
