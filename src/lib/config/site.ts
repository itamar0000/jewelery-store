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
