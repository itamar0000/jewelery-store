import Link from 'next/link';

import { Button } from '@/components/ui/Button';
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
 * Each item links to its own answer on `/faq` (`/faq#<id>`) - it used to land
 * on the top of that page and leave the reader to find it - rather than to an
 * article route that would 404. The bodies of the section 33 educational guides
 * are still an unwritten content task.
 */
const FAQ_TOPICS: readonly { id: string; title: string }[] = [
  { id: 'natural-or-lab', title: 'היהלומים טבעיים או יהלומי מעבדה?' },
  { id: 'karat', title: 'מה ההבדל בין 14K ל-18K?' },
  { id: 'ring-size', title: 'איך יודעים מידת טבעת?' },
];

export function FaqSection() {
  return (
    <Container as="section" aria-labelledby="faq-heading" className="py-section">
      <div className="mx-auto max-w-(--container-narrow)">
        <h2
          id="faq-heading"
          className="font-display text-4xl leading-[1.1] font-normal text-balance md:text-5xl"
        >
          שאלות נפוצות
        </h2>

        <ul className="border-border mt-10 border-t">
          {FAQ_TOPICS.map((topic) => (
            <li key={topic.id} className="border-border border-b">
              <Link
                href={`/faq#${topic.id}`}
                className="group flex items-center justify-between gap-4 py-5 transition-colors"
              >
                <span className="font-display group-hover:text-accent text-xl transition-colors">
                  {topic.title}
                </span>
                <ChevronIcon className="text-muted-foreground icon-directional size-4 shrink-0" />
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-8">
          <Button href="/faq" variant="secondary">
            לכל השאלות
          </Button>
        </div>
      </div>
    </Container>
  );
}
