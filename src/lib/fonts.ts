import { Heebo } from 'next/font/google';

/**
 * Font loading.
 *
 * THIS FILE IS THE SINGLE PLACE THE BRAND FONT IS CONFIGURED.
 *
 * The brand typeface is TBD (MASTER_SPECIFICATION section 2, TBD.md). Heebo is
 * a deliberate placeholder, not a choice: it is a well-hinted open Hebrew face
 * with a matching Latin set, which is what the mixed Hebrew/Latin product copy
 * needs (section 49 - "VS1", "14K", "Rose Gold" appear inside Hebrew
 * sentences). It is here so the loading infrastructure is real and testable,
 * not because it is the brand.
 *
 * Swapping it later is a change to this file only:
 *
 *   - another Google face: change the import and the constructor;
 *   - a licensed brand face: replace `next/font/google` with
 *     `next/font/local` and point it at the font files.
 *
 * Everything downstream binds to the CSS variable, never to the family name.
 * `--font-hebrew-sans` is consumed by `--font-sans` in src/styles/tokens.css,
 * which is what the Tailwind `font-sans` utility resolves to. No component
 * names a font.
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
