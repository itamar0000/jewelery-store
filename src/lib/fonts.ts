import { Cormorant_Garamond, Heebo } from 'next/font/google';

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
 * THE ANSWER USED HERE is the one both Israeli reference stores reached
 * independently: SET LATIN CAMPAIGN LINES IN A DISPLAY SERIF, AND EVERYTHING
 * ELSE IN HEBREW. A short English line over a photograph - "THE PERFECT STACK"
 * - does the expressive work, and the Hebrew underneath does the reading. It
 * is an established convention in Israeli fashion retail rather than an
 * import, so it does not read as a foreign site.
 *
 * Cartier's own stack is built the same way, with the RTL face sitting in the
 * fallback position behind the Latin one:
 *
 *     "Fancy Cut", Almarai, Times, serif        <- display
 *     "Brilliant Cut", Almarai, Helvetica       <- UI
 *
 * WHICH IS WHY THE FALLBACK ORDER IN tokens.css MATTERS. `--font-display`
 * lists the Latin face FIRST and the Hebrew face SECOND. Font fallback is
 * per-glyph, so a heading containing both scripts resolves Latin glyphs to
 * Cormorant and Hebrew glyphs to Heebo automatically, with no per-language
 * markup. Reversing that order would silently kill the display face, because
 * Heebo covers Latin too and would win every glyph.
 *
 * A CAVEAT THAT SHAPES THE COMPONENTS. Cormorant has a much smaller x-height
 * than Heebo, so the two faces do NOT look the same size at the same
 * `font-size`. Mixing them inside one sentence looks like a rendering fault.
 * Display type is therefore given its OWN slot in the components that use it -
 * see the `displayLine` prop on Hero - rather than being blended into Hebrew
 * copy. The token is the mechanism; the slot is the design.
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
 * The display face. Latin campaign lines only - hero eyebrows, section
 * openers, the closing banner.
 *
 * Cormorant Garamond is a high-contrast old-style serif with a genuine 300
 * weight, which is the cut that matters: at 300 and set large it reads as
 * restraint, where the same face at 600 reads as a wedding invitation. The
 * brief warns specifically against black-and-gold "luxury" styling
 * (MASTER_SPECIFICATION section 2), and a light serif is how the modern end of
 * this category stays expensive without that.
 *
 * STILL PROVISIONAL, like everything else in the brand layer (TBD.md D3).
 * Credible alternatives, all `next/font/google` one-line swaps:
 *
 *   - `Italiana`  - far more extreme contrast, one weight only. A wordmark
 *                   face; beautiful at 6xl, fragile below 2xl.
 *   - `Tenor_Sans` - if the house should read as a light spaced SANS rather
 *                   than a serif. This is closer to what Malka does.
 *   - `Marcellus` - inscriptional roman. Quieter and more architectural.
 *
 * Latin subset ONLY, and that is not an oversight. This face is never asked to
 * set Hebrew - Heebo picks those glyphs up through the fallback chain - so
 * shipping a Hebrew subset would download glyphs that can never render.
 */
export const latinDisplay = Cormorant_Garamond({
  subsets: ['latin'],
  variable: '--font-latin-display',
  display: 'swap',

  // Not variable on Google Fonts. 300 is the design weight; 400 exists for the
  // rare line that needs to hold against a bright photograph.
  weight: ['300', '400'],

  // DISABLED DELIBERATELY. The metric-adjusted fallback Next synthesises is
  // tuned to minimise layout shift, but Cormorant's small x-height makes the
  // adjusted local fallback noticeably wrong, and it lands on the largest text
  // on the page. A clean swap is less distracting here than a bad match.
  adjustFontFallback: false,
});
