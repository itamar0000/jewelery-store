import { Frank_Ruhl_Libre, Heebo } from 'next/font/google';

/**
 * Font loading.
 *
 * THIS FILE IS THE SINGLE PLACE THE BRAND FONTS ARE CONFIGURED.
 *
 * There are TWO faces, and they do different jobs. That split is the design
 * decision recorded here, and it is the one that makes a Hebrew storefront able
 * to carry display typography at all.
 *
 * THE PROBLEM. Luxury display typography in Latin leans on high-contrast
 * serifs - hairline thins against heavy stems, set large and airy. Almost none
 * of those faces have Hebrew glyphs, and the handful of Hebrew display faces
 * that reach the same register are commercial licences from Israeli foundries,
 * not a `next/font/google` import. Aliasing `--font-display` to the body sans,
 * which is what this file used to do, sidestepped the problem by having no
 * display typography at all.
 *
 * THE ANSWER TRIED FIRST, AND WHY IT FAILED. The original split was the one
 * both Israeli reference stores use: set short LATIN campaign lines in a
 * display serif and everything else in Hebrew, letting per-glyph fallback
 * route each script to the right face. The mechanism is sound and it worked -
 * but it assumes there IS Latin campaign copy. This storefront has two Latin
 * words in total, so the display face rendered twice on the entire site and
 * Heebo set every heading. The brand's typographic voice was configured,
 * loaded, and never seen.
 *
 * THE ANSWER USED NOW: ONE SERIF THAT COVERS BOTH SCRIPTS. Frank Ruhl Libre
 * carries Hebrew and Latin in a single family, so a heading is set in the
 * display face whichever script it is written in, and a heading holding both
 * does not change face mid-line. `--font-display` is a real voice rather than
 * a slot that only fills for foreign words.
 *
 * WHAT THAT COSTS. The Latin-lead order is gone, and with it the option of a
 * Latin-only face like Cormorant that has no Hebrew at all. Reintroducing one
 * means putting it FIRST in `--font-display` so it claims Latin glyphs, with
 * Frank Ruhl Libre behind it for Hebrew - the same per-glyph mechanism, now
 * with a Hebrew serif in the fallback position instead of a sans.
 *
 * THE ORDER IN tokens.css STILL MATTERS, for the same reason as before: Heebo
 * covers Latin as well as Hebrew, so it must come AFTER the display face or it
 * would win every glyph and the serif would silently never render - a failure
 * indistinguishable from the font not loading.
 *
 * A CAVEAT THAT SHAPED THE COMPONENTS, now largely spent. The old pairing had
 * badly mismatched x-heights, so display type was given its own slot rather
 * than blended into Hebrew copy - see the `displayLine` prop on Hero. With one
 * family across both scripts that constraint no longer applies, though the
 * slot remains useful as a composition device.
 *
 * SWAPPING EITHER FACE IS A CHANGE TO THIS FILE ONLY. Nothing downstream names
 * a font; everything binds to the CSS variables, which tokens.css maps to
 * `--font-sans` and `--font-display`.
 */

/**
 * The reading face. Hebrew body copy, product names, navigation, prices, and
 * every piece of UI text on the site.
 *
 * Heebo is a deliberate placeholder, not a brand choice (TBD.md D3): a
 * well-hinted open Hebrew face with a matching Latin set, which is what mixed
 * Hebrew/Latin product copy needs - "VS1", "14K", "Rose Gold" appear inside
 * Hebrew sentences (MASTER_SPECIFICATION section 49).
 */
export const hebrewSans = Heebo({
  subsets: ['hebrew', 'latin'],

  // Binds the family to a CSS variable rather than emitting a class that sets
  // font-family directly, so the token layer stays the single source of truth.
  variable: '--font-hebrew-sans',

  // Show the fallback immediately and swap when the webfont arrives. A blank
  // first paint is worse than a font shift on a catalog browsed over mobile
  // networks (section 46).
  display: 'swap',

  // Variable font: one file covers the whole weight range, so the weights the
  // brand eventually wants cost no extra requests.
  weight: 'variable',

  // Next generates a size-adjusted local fallback from this, which cuts the
  // layout shift when the swap happens.
  adjustFontFallback: true,
});

/**
 * The display face, for every heading in both scripts.
 *
 * WHAT WAS WRONG BEFORE, AND WHY IT WAS INVISIBLE. This slot used to hold
 * Cormorant Garamond, subset to Latin only, on the reasoning that Hebrew would
 * fall through to Heebo. The mechanism worked exactly as designed - and the
 * result was that the serif never appeared, because this storefront is in
 * Hebrew. Two words on the whole site are Latin ("Fine Jewelry"), so the face
 * chosen to carry the brand's voice rendered twice and Heebo set every real
 * heading. Heebo is an excellent interface sans and has no display voice at
 * all, which is the single largest reason the site read as clean but generic.
 * Nothing was broken; the font simply had no glyphs to claim.
 *
 * FRANK RUHL LIBRE CARRIES BOTH. It is the modern revival of Frank-Rühl, the
 * type most Hebrew books have been set in for a century, so it reads to a
 * Hebrew eye the way a Garamond reads to a Latin one: as the serif of printed
 * matter rather than as a decorative choice. Its Latin companion is drawn to
 * sit with it, which is why one family now serves both scripts instead of
 * pairing two unrelated serifs across a single heading.
 *
 * DROPPING CORMORANT IS A REAL TRADE, not a cleanup. Cormorant at 300 is the
 * lighter, more fashion-adjacent face, and the "Fine Jewelry" line loses that
 * flavour. It buys a single display voice across scripts and one less font to
 * download. Restoring it for Latin alone is a two-line change: add it back
 * here and put its variable first in `--font-display`.
 *
 * STILL PROVISIONAL, like everything else in the brand layer (TBD.md D3).
 * Alternatives that also cover Hebrew, all one-line swaps:
 *
 *   - `Noto_Serif_Hebrew` - neutral and highly legible; less character.
 *   - `David_Libre`       - warmer, closer to a humanist book face.
 *   - `Heebo` at 300      - if the house should read as a light SANS instead.
 *                           Closer to what Malka does, and a different brief.
 */
export const displaySerif = Frank_Ruhl_Libre({
  // BOTH subsets, unlike the face this replaces. Hebrew is the point of it.
  subsets: ['hebrew', 'latin'],
  variable: '--font-display-serif',
  display: 'swap',

  // Variable font: the whole 300-900 range in one file, so a later decision to
  // set headings lighter or heavier costs no extra request.
  weight: 'variable',

  // Left ON here, unlike the previous face. Frank Ruhl Libre's x-height is
  // close to the local Hebrew fallbacks, so the metric-adjusted fallback Next
  // synthesises is a good match and cuts the shift on the largest text.
  adjustFontFallback: true,
});
