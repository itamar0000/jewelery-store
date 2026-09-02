import Link from 'next/link';

import { Container } from '@/components/ui/Container';
import { ChevronIcon } from '@/components/ui/icons';

/**
 * A short FAQ preview, low on the homepage.
 *
 * DELIBERATELY SMALL. The homepage is a shopping experience, not a help centre.
 * The previous version gave this a full centred `SectionHeading`, the same
 * vertical padding as the product bands and a four-item two-column grid, which
 * bought a support page roughly the same visual weight as the best sellers.
 * Three questions on a single narrow column, under a modest heading, is the
 * amount of room the subject earns here.
 *
 * The questions are the three a first-time jewellery buyer actually asks - what
 * kind of stone, what karat means, and how to size a ring. Everything else,
 * including care and delivery, lives behind the link.
 *
 * Each item links to `/faq`, where the answer is written, rather than to an
 * article route that would 404. The bodies of the section 33 educational guides
 * are still an unwritten content task.
 */
const FAQ_TOPICS: readonly { id: string; title: string }[] = [
  { id: 'natural-or-lab', title: 'היהלומים טבעיים או יהלומי מעבדה?' },
  { id: 'gold', title: 'מה ההבדל בין 14K ל-18K?' },
  { id: 'ring-size', title: 'איך יודעים מידת טבעת?' },
];

export function FaqSection() {
  return (
    <Container as="section" aria-labelledby="faq-heading" className="py-section">
      <div className="mx-auto max-w-(--container-narrow)">
        <h2
          id="faq-heading"
          className="font-display text-xl tracking-tight text-balance md:text-2xl"
        >
          שאלות נפוצות
        </h2>

        <ul className="border-border mt-6 border-t">
          {FAQ_TOPICS.map((topic) => (
            <li key={topic.id} className="border-border border-b">
              <Link
                href="/faq"
                className="group flex items-center justify-between gap-4 py-4 transition-colors"
              >
                <span className="group-hover:text-accent text-sm transition-colors">
                  {topic.title}
                </span>
                <ChevronIcon className="text-muted-foreground icon-directional size-4 shrink-0" />
              </Link>
            </li>
          ))}
        </ul>

        <Link
          href="/faq"
          className="hover:text-accent mt-6 inline-flex items-center gap-1 text-sm transition-colors"
        >
          לכל השאלות
          <ChevronIcon className="icon-directional size-4" />
        </Link>
      </div>
    </Container>
  );
}
