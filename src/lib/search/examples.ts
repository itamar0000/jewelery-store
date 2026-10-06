/**
 * Example searches, offered before anything is typed and after a search that
 * found nothing.
 *
 * EXAMPLES, AND LABELLED AS EXAMPLES. These are the sample queries from
 * MASTER_SPECIFICATION section 27, chosen because each one matches real
 * products. They are not measured: no search log exists. They used to be
 * headed "חיפושים פופולריים", "חיפושים נפוצים" and - after a failed search -
 * "אולי התכוונת", which claimed a popularity count and a spelling correction
 * the site never made. Every heading over this list now says what it is.
 *
 * One list for the search overlay and the search page, so the two cannot
 * offer different examples. When search analytics exist, real popular queries
 * can replace it - under a heading that may then say "popular".
 */
export const SEARCH_EXAMPLES: readonly string[] = [
  'טבעת אירוסין',
  'צמיד טניס',
  'עגילי יהלום',
  'שרשרת שם',
  'זהב לבן',
];

/** Over the examples before a search. */
export const SEARCH_EXAMPLES_HEADING = 'הצעות לחיפוש';

/** Over the examples after a search that found nothing. */
export const SEARCH_RETRY_HEADING = 'אפשר לנסות';
