import Link from 'next/link';

import { Container } from '@/components/ui/Container';
import { PlaceholderImage } from '@/components/ui/PlaceholderImage';
import type { NavItem } from '@/lib/navigation/taxonomy';

/**
 * The mega menu panel.
 *
 * Presentational only - open/close state belongs to DesktopNav. It renders the
 * columns from the taxonomy plus an optional feature panel.
 *
 * VISUAL RESTRAINT IS THE REQUIREMENT (MASTER_SPECIFICATION section 6: "clean
 * and visually premium", "do not overload"). Concretely that means:
 *
 *   - the panel is only as tall as its content, never a full-viewport curtain;
 *   - link text stays at body size - a mega menu is a directory, not a banner;
 *   - one hairline top border and a soft shadow, no heavy chrome;
 *   - generous column spacing does the visual work instead of dividers.
 *
 * The panel is a `<section>` labelled by the trigger, so a screen-reader user
 * who moves into it is told which menu they are in.
 */
export function MegaMenu({ item, labelledBy }: { item: NavItem; labelledBy: string }) {
  if (!item.columns) return null;

  return (
    <section
      aria-labelledby={labelledBy}
      className="border-border bg-card absolute inset-x-0 top-full border-t shadow-lg"
    >
      {/*
       * LAYOUT: link columns packed at the inline start, feature panel pinned
       * to the inline end.
       *
       * The first pass laid every child out with
       * `grid-cols-[repeat(auto-fit,minmax(11rem,1fr))]`. With only two link
       * columns and a feature, auto-fit stretched three tracks across the whole
       * 1440px container and left a ~400px void in the middle of the panel -
       * visible on screen as a menu with a hole in it. Content was clamped to
       * the two outer edges and the eye had to cross the gap to connect them.
       *
       * The fix is that NOTHING stretches. Columns and feature both take their
       * natural width and pack against the inline start, so the slack collects
       * as one margin at the end of the row instead of as a hole in the middle.
       * Slack at an edge reads as whitespace; slack between two pieces of
       * content reads as a bug.
       */}
      <Container className="flex flex-col gap-10 py-12 lg:flex-row lg:items-start lg:gap-16">
        <div className="flex flex-wrap gap-x-16 gap-y-10 lg:shrink-0">
          {item.columns.map((column) => (
            <div key={column.id} className="min-w-40">
              {column.title && (
                <h3 className="text-muted-foreground text-2xs mb-5 font-medium">{column.title}</h3>
              )}

              <ul className="space-y-3">
                {column.links.map((link) => (
                  <li key={link.id}>
                    <Link
                      href={link.href}
                      className="hover:text-accent block text-sm transition-colors duration-150"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {item.feature && (
          <div className="w-full lg:w-96 lg:shrink-0">
            {/*
             * `image` is unset everywhere today - the photography is TBD - so
             * this renders the neutral placeholder surface. When a real asset
             * arrives, the taxonomy entry gains an `image` and this becomes an
             * <Image>. Nothing else changes.
             *
             * Landscape, not square. A square at this width made the panel
             * ~560px tall - a menu that covers half the viewport stops being a
             * menu and becomes a page. The wider crop fills the same width in
             * two thirds of the height.
             */}
            <PlaceholderImage ratio="landscape" label={item.feature.title} />

            <h3 className="mt-4 text-sm font-medium">{item.feature.title}</h3>
            <p className="text-muted-foreground mt-1.5 text-xs">{item.feature.description}</p>

            <Link
              href={item.feature.href}
              className="text-accent hover:text-foreground mt-3 inline-block text-xs underline underline-offset-4 transition-colors"
            >
              {item.feature.linkLabel}
            </Link>
          </div>
        )}
      </Container>
    </section>
  );
}
