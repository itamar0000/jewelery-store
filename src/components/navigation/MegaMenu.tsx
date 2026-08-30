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
      <Container className="grid grid-cols-[repeat(auto-fit,minmax(11rem,1fr))] gap-x-10 gap-y-8 py-10">
        {item.columns.map((column) => (
          <div key={column.id}>
            {column.title && (
              <h3 className="text-muted-foreground text-2xs tracking-snug mb-4 font-medium">
                {column.title}
              </h3>
            )}

            <ul className="space-y-2.5">
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

        {item.feature && (
          <div className="border-border md:border-s md:ps-10">
            {/*
             * `image` is unset everywhere today - the photography is TBD - so
             * this renders the neutral placeholder surface. When a real asset
             * arrives, the taxonomy entry gains an `image` and this becomes an
             * <Image>. Nothing else changes.
             */}
            <PlaceholderImage ratio="landscape" label={item.feature.title} className="rounded-sm" />

            <h3 className="mt-4 text-sm font-medium">{item.feature.title}</h3>
            <p className="text-muted-foreground mt-1 text-xs">{item.feature.description}</p>

            <Link
              href={item.feature.href}
              className="text-accent mt-3 inline-block text-xs underline underline-offset-4"
            >
              {item.feature.linkLabel}
            </Link>
          </div>
        )}
      </Container>
    </section>
  );
}
