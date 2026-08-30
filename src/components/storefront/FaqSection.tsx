import Link from 'next/link';

import { Container } from '@/components/ui/Container';
import { ChevronIcon } from '@/components/ui/icons';

import { SectionHeading } from './SectionHeading';

/**
 * FAQ entry points on the homepage.
 *
 * MASTER_SPECIFICATION section 33 lists the educational content the store
 * should carry. These are the TOPIC titles from that section, which are
 * structural rather than authored - the guide bodies themselves are a content
 * task that has not happened, so each card links to `/faq`, where the answer
 * actually lives, rather than to an article route that would 404.
 *
 * A plain list, not cards with imagery: this sits low on the page and competing
 * with the product sections above it would be a mistake.
 */
const FAQ_TOPICS: readonly { id: string; title: string; summary: string }[] = [
  {
    id: 'lab-grown',
    title: 'מה זה יהלום מעבדה?',
    summary: 'מה ההבדל מיהלום כרוי, ואיך זה משפיע על המחיר.',
  },
  { id: 'ring-size', title: 'איך יודעים מידת טבעת?', summary: 'איך למדוד מידה נכון לפני הזמנה.' },
  {
    id: 'gold',
    title: 'מה ההבדל בין 14K ל-18K?',
    summary: '14K מול 18K, וההבדל בין צהוב, לבן ורוז.',
  },
  { id: 'care', title: 'איך שומרים על התכשיט?', summary: 'שמירה על תכשיט לאורך זמן.' },
];

export function FaqSection() {
  return (
    <Container as="section" aria-labelledby="guides-heading" className="py-16 md:py-20">
      <SectionHeading
        id="faq-heading"
        title="שאלות ותשובות"
        description="מה שכדאי לדעת לפני קנייה."
        href="/faq"
      />

      <ul className="border-border grid gap-px border-y md:grid-cols-2">
        {FAQ_TOPICS.map((topic) => (
          <li key={topic.id}>
            <Link
              href="/faq"
              className="group hover:bg-muted/60 flex items-center justify-between gap-4 py-5 transition-colors"
            >
              <span>
                <span className="group-hover:text-accent block text-sm transition-colors">
                  {topic.title}
                </span>
                <span className="text-muted-foreground mt-1 block text-xs">{topic.summary}</span>
              </span>

              <ChevronIcon className="text-muted-foreground icon-directional size-4 shrink-0" />
            </Link>
          </li>
        ))}
      </ul>
    </Container>
  );
}
