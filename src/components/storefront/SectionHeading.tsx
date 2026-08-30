import Link from 'next/link';

import { ChevronIcon } from '@/components/ui/icons';

/**
 * Heading block shared by every homepage section.
 *
 * Exists so section rhythm is defined once: the same type scale, the same space
 * beneath, the same optional "see all" affordance. Sections that each style
 * their own heading drift within a release, and the drift is what makes a
 * storefront look unconsidered.
 *
 * CENTRED, and the "see all" link sits BELOW rather than opposite. The first
 * pass put the title at the inline-start edge with the link pushed to the far
 * end of the same row. In RTL that reads badly: the title is jammed against the
 * heavy right margin while the link floats alone at the left, and the eye has
 * to cross the full page width to connect two parts of one heading. Stacking
 * them centred keeps the pair together and gives the section a real top edge.
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
    <div className="mb-10 text-center">
      <h2 id={id} className="text-2xl tracking-tight text-balance">
        {title}
      </h2>

      {description && (
        <p className="text-muted-foreground mx-auto mt-3 max-w-(--container-prose) text-sm text-pretty">
          {description}
        </p>
      )}

      {href && (
        <Link
          href={href}
          className="hover:text-accent mt-5 inline-flex items-center gap-1 text-sm transition-colors"
        >
          {linkLabel}
          {/* Directional: it points along the reading direction. */}
          <ChevronIcon className="icon-directional size-4" />
        </Link>
      )}
    </div>
  );
}
