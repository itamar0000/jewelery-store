import Link from 'next/link';

import { ChevronIcon } from '@/components/ui/icons';

/**
 * Heading block shared by every homepage section.
 *
 * Exists so section rhythm is defined once: the same type scale, the same space
 * beneath, the same optional "see all" affordance. Sections that each style
 * their own heading drift within a release, and the drift is exactly what makes
 * a storefront look unconsidered.
 *
 * Renders `<h2>`, which is correct beneath the single `<h1>` a page carries.
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
    <div className="mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="max-w-(--container-prose)">
        <h2 id={id} className="text-2xl tracking-tight">
          {title}
        </h2>
        {description && <p className="text-muted-foreground mt-2 text-sm">{description}</p>}
      </div>

      {href && (
        <Link
          href={href}
          className="hover:text-accent group inline-flex items-center gap-1 text-sm transition-colors"
        >
          {linkLabel}
          {/* Directional: it points along the reading direction. */}
          <ChevronIcon className="icon-directional size-4" />
        </Link>
      )}
    </div>
  );
}
