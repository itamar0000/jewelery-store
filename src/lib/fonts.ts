import { Frank_Ruhl_Libre, Heebo } from 'next/font/google';

/**
 * Font loading.
 *
 * THIS FILE IS THE SINGLE PLACE THE BRAND FONTS ARE CONFIGURED.
 *
 * THE ATELIER PAIRING (D4D.26). The owner chose design A from five rendered
 * alternatives (docs/design-alternatives/a-atelier.html): a quiet jewellery
 * atelier in ivory and forest green. Its voice is two Israeli faces:
 *
 * - FRANK RUHL LIBRE for every heading. A Hebrew book serif, cut from the
 *   letters Rafael Frank drew for Jerusalem printing a century ago - so it
 *   reads as a Hebrew jeweller's own lettering rather than a borrowed Latin
 *   "luxury" serif. Set at size in its regular weight; its contrast does the
 *   work that weight would.
 * - HEEBO for everything read. Clean, open, and light at 300 for prose, so
 *   the serif above it keeps the hierarchy without a third weight.
 *
 * Both carry Hebrew and Latin, so "14K", "VS1" and the Latin wordmark sit in
 * the same face as the Hebrew around them.
 *
 * WHAT WAS HERE BEFORE. Miriam Libre and Assistant, chosen for a paper-and-ink
 * world that carried its identity in squarish struck type. That world is gone,
 * and a struck face under an atelier's arches would be the wrong object.
 */

export const houseSans = Heebo({
  subsets: ['hebrew', 'latin'],

  // Binds the family to a CSS variable rather than emitting a class that sets
  // font-family directly, so the token layer stays the single source of truth.
  variable: '--font-house-sans',

  // Show the fallback immediately and swap when the webfont arrives. A blank
  // first paint is worse than a font shift on a catalog browsed over mobile
  // networks (section 46).
  display: 'swap',

  // Variable font: one file covers 300 for prose up to 500 for labels.
  weight: 'variable',

  adjustFontFallback: true,
});

export const houseDisplay = Frank_Ruhl_Libre({
  subsets: ['hebrew', 'latin'],
  variable: '--font-house-display',
  display: 'swap',
  weight: 'variable',
  adjustFontFallback: true,
});
