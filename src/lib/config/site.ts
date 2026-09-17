/**
 * Document-level locale contract for the customer-facing application.
 *
 * RTL is structural, not a skin (ARCHITECTURE §1.6, §3.2): direction is
 * declared once on the root <html> element and is never re-declared per
 * component. These constants exist so that the root layout, metadata and any
 * future locale-aware formatter all read the same single source.
 *
 * The store is Hebrew, Israel-only (MASTER_SPECIFICATION §1). There is no
 * locale switcher and no second locale planned, so these are constants rather
 * than configuration.
 */

/** `lang` attribute on <html>. */
export const SITE_LANG = 'he';

/** `dir` attribute on <html>. The whole storefront is right-to-left. */
export const SITE_DIR = 'rtl';

/**
 * BCP-47 tag for `Intl` formatters. Phase 1's `lib/money` formats ILS prices
 * through this value; nothing may hard-code a locale string of its own.
 */
export const SITE_LOCALE = 'he-IL';

/**
 * The store's name, everywhere it is spoken: the wordmark, the `<title>`
 * template and the copyright line.
 *
 * INTERIM, AND DELIBERATELY A NAME RATHER THAN A DESCRIPTION. What stood here
 * was "חנות תכשיטים" - literally "jewellery shop" - in all three places. A
 * category cannot be remembered, recommended or searched for, and jewellery is
 * sold on a name more than most things are. Any real name outperforms the
 * category, which is why this is provisional rather than pending.
 *
 * "עדי" is the Biblical Hebrew word for an ornament or a piece of jewellery
 * (Exodus 33, Ezekiel 16). It is also an ordinary Israeli given name, which is
 * how this market's established houses are named - Malka, Goldy, Yaniv - so it
 * reads as a jeweller rather than as a coined brand.
 *
 * ONE CONSTANT, ON PURPOSE. Replacing it when the real name is settled is an
 * edit here and nowhere else; nothing downstream spells the name out.
 */
export const SITE_NAME = 'עדי';

/**
 * One line describing the store, for the home page `<title>` and share cards.
 *
 * Says what is sold and what is distinctive, and asserts nothing the catalog
 * does not back: the store carries BOTH natural and lab-grown stones, so this
 * may never position it as exclusively one (MASTER_SPECIFICATION section 2).
 */
export const SITE_TAGLINE = 'תכשיטי זהב ויהלומים בעיצוב אישי';
