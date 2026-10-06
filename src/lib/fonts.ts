import { Assistant, Miriam_Libre } from 'next/font/google';

/**
 * Font loading.
 *
 * THIS FILE IS THE SINGLE PLACE THE BRAND FONTS ARE CONFIGURED.
 *
 * THE BRIEF THESE TWO FACES ANSWER. The site is paper and ink and nothing
 * else: no accent colour, no field, no ornament. With colour taken off the
 * table the identity has to be carried by the letterforms and by scale, which
 * puts more weight on this file than a palette-led design would - a compact,
 * squarish face with real character for everything struck at size, a clear
 * workhorse for reading, and figures that line up in a column because karats,
 * lengths and prices get compared.
 *
 * THESE TWO SURVIVED A WORLD CHANGE. They were chosen for an earlier direction
 * built around a diamond parcel, which the owner rejected; the faces were kept
 * on their own merits when the world was replaced, not inherited by accident.
 *
 * WHAT WAS HERE BEFORE, AND WHY IT WENT. The previous pairing was Frank Ruhl
 * Libre over Heebo: a Hebrew book serif for display, a neutral Hebrew sans for
 * everything else. Nothing was wrong with it mechanically - it was the second
 * attempt and it fixed a real bug, a Latin-only display face on a Hebrew site
 * that therefore never rendered. It was replaced because a high-contrast serif
 * display over a warm light ground is the single most common shape a generated
 * interface takes, and the site read as clean but anonymous. The serif is not
 * banned; it is the shape every generated storefront takes, and this site wore
 * it once already.
 *
 * THE ORDER IN tokens.css STILL MATTERS, and for the same reason it did
 * before. Font fallback is per GLYPH, not per element: the browser walks the
 * list for each character and takes the first family that has it. Assistant
 * covers Latin as well as Hebrew, so it must come AFTER the display face in
 * `--font-display` or it would win every glyph and the display face would
 * silently never render - a failure indistinguishable from the font not
 * loading. That exact failure has happened once on this site already.
 *
 * BOTH FACES CARRY HEBREW AND LATIN. A heading holding "18K" inside a Hebrew
 * line does not change face mid-line, which is the whole reason the faces were
 * chosen as a pair rather than picked separately.
 *
 * SWAPPING EITHER FACE IS A CHANGE TO THIS FILE ONLY. Nothing downstream names
 * a font; everything binds to the CSS variables, which tokens.css maps to
 * `--font-sans` and `--font-display`.
 */

/**
 * The reading face. Hebrew body copy, product names, navigation, the written
 * ruled fields, and every measurement on the site.
 *
 * Assistant is a contemporary Hebrew sans drawn for screen with an unusually
 * even colour, which is what a page of specifications needs: karat, colour,
 * length and stone terms sit in ruled fields and are read by comparison rather
 * than as prose. Its Latin companion is drawn with the Hebrew rather than
 * borrowed, so "VS1", "14K" and "585" inside a Hebrew sentence keep the same
 * texture (MASTER_SPECIFICATION section 49).
 *
 * It replaces Heebo, which is a fine interface sans and was never the problem;
 * Assistant simply has more of a voice at the weights this world uses, and a
 * firmer, flatter finish that sits with printed paper rather than with an app.
 */
export const houseSans = Assistant({
  subsets: ['hebrew', 'latin'],

  // Binds the family to a CSS variable rather than emitting a class that sets
  // font-family directly, so the token layer stays the single source of truth.
  variable: '--font-house-sans',

  // Show the fallback immediately and swap when the webfont arrives. A blank
  // first paint is worse than a font shift on a catalog browsed over mobile
  // networks (section 46).
  display: 'swap',

  // Variable font: one file covers the whole weight range, so the light
  // margin annotations and the heavy stamped labels cost no extra requests.
  weight: 'variable',

  // Next generates a size-adjusted local fallback from this, which cuts the
  // layout shift when the swap happens.
  adjustFontFallback: true,
});

/**
 * The display face. Every struck and stamped line: the wordmark, the one large
 * statement on the home page, section titles, and the house mark.
 *
 * Miriam Libre is the open revival of Miriam, one of the Hebrew faces Israeli
 * printing has been set in for decades. It is squarish and compact with flat
 * terminals and very little modulation - letters that look CUT rather than
 * written, which is exactly what a rubber stamp and a struck hallmark produce.
 * Set large it reads as printed matter from the trade rather than as
 * luxury-boutique display type, and that distinction is the whole point of
 * replacing the serif.
 *
 * TWO WEIGHTS, NOT A VARIABLE AXIS. Miriam Libre ships 400 and 700 only. That
 * is a real constraint and it shapes the type scale: hierarchy on this site
 * comes from SIZE and from the difference between struck display and written
 * margin, not from six weights of one face. A page that needs a weight between
 * these two is a page whose hierarchy is not yet decided.
 *
 * STILL PROVISIONAL IN ONE RESPECT. The brand NAME is interim (PRODUCT.md), so
 * the wordmark is typographic and nothing about it depends on the particular
 * letters. When a name lands, it is set in this face; when a drawn logo lands,
 * this face steps back to section titles.
 */
export const houseDisplay = Miriam_Libre({
  subsets: ['hebrew', 'latin'],
  variable: '--font-house-display',
  display: 'swap',

  // The two weights the family actually has. Requesting a third silently
  // fails the build.
  weight: ['400', '700'],

  // Left ON. Miriam Libre's x-height is close to the local Hebrew fallbacks,
  // so the metric-adjusted fallback Next synthesises is a good match and cuts
  // the shift on the largest text on the page.
  adjustFontFallback: true,
});
