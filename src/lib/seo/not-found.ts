import type { Metadata } from 'next';

/**
 * What a page says about itself when the thing it would show does not exist.
 *
 * EVERY `generateMetadata` THAT CAN 404 RETURNS THIS for the missing case -
 * not `{}`. Next streams a page's metadata to the browser separately from its
 * HTML, and when a page calls `notFound()` the HTML carries the not-found
 * page's title while the streamed metadata carries the PAGE's. Empty page
 * metadata meant the site's default title, so on hydration the tab of every
 * 404 switched from "הדף לא נמצא" to the homepage's title. Returning this from
 * the page itself makes both say the same thing.
 *
 * The site's title template adds the brand: "הדף לא נמצא | Jewelry for Less".
 */
export const NOT_FOUND_TITLE = 'הדף לא נמצא';

export const notFoundMetadata: Metadata = { title: NOT_FOUND_TITLE };
