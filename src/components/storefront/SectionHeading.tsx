import Link from 'next/link';

/**
 * Heading block shared by every homepage section.
 *
 * Exists so section rhythm is defined once: the same type scale, the same space
 * beneath, the same optional "see all" affordance. Sections that each style
 * their own heading drift within a release, and the drift is what makes a
 * storefront look unconsidered.
 *
 * AT THE INLINE START, with the "see all" link BELOW rather than opposite. The
 * first pass put the link at the far end of the title's row, and the eye had to
 * cross the page to connect two parts of one heading; stacking keeps the pair
 * together. It was then centred - while every page title, the hero line and the
 * category band's heading begin at the inline start - so the home page changed
 * alignment from band to band (critique 2026-10-06). It now starts where every
 * other heading on the site starts (D4D.18).
 *
 * Renders `<h2>`, correct beneath the single `<h1>` a page carries.
 */
export function SectionHeading({
  id,
  title,
  description,
  href,
  linkLabel = 'לצפייה בהכל',
}: {
  id: string;
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-12">
      {/* Steps up on desktop. The hero line runs to `--text-7xl`, so a section
          title fixed at `text-2xl` sits too close to body copy to register as
          a level of its own. */}
      <h2
        id={id}
        className="font-display text-accent text-2xl font-bold tracking-tight text-balance md:text-3xl"
      >
        {title}
      </h2>

      {description && (
        <p className="text-muted-foreground mt-4 max-w-(--container-prose) text-sm text-pretty">
          {description}
        </p>
      )}

      {href && (
        /*
         * THE SAME LINE OF TYPE AS A COLLECTION'S "VIEW" (DESIGN.md, the
         * Underlined Action Rule). It was a fourth action style - a chevron
         * link whose hover changed ink to ink, so it had no hover at all. The
         * rule under it goes from hairline to ink instead.
         */
        <Link
          href={href}
          className="decoration-border-strong hover:decoration-foreground touch-target mt-5 inline-block text-sm font-semibold underline underline-offset-[0.4em] transition-colors"
        >
          {linkLabel}
        </Link>
      )}
    </div>
  );
}
