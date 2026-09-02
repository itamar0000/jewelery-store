import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { PlaceholderImage } from '@/components/ui/PlaceholderImage';
import { cn } from '@/components/ui/cn';

/**
 * Image-beside-copy editorial band.
 *
 * Three homepage sections share exactly this shape - lab-grown diamond
 * education (MASTER_SPECIFICATION section 33), custom jewelry (section 17) and
 * bridal (section 30) - so they share one component rather than three
 * near-identical ones. Content comes from the route.
 *
 * `imageSide` alternates the composition down the page so the bands do not read
 * as a stack of identical blocks. It is expressed with `order`, which is
 * direction-agnostic: in RTL the "start" side is the right, and the layout
 * follows the document rather than needing a mirrored variant.
 *
 * Stacks to a single column below `md`, image first - on a phone the picture
 * establishes the subject faster than a heading does.
 */
export interface EditorialPanelProps {
  id: string;
  eyebrow?: string;
  title: string;
  body: string;
  points?: readonly string[];
  action?: { label: string; href: string };
  imageSide?: 'start' | 'end';
  imageLabel?: string;
  tone?: 'default' | 'muted';
}

export function EditorialPanel({
  id,
  eyebrow,
  title,
  body,
  points,
  action,
  imageSide = 'start',
  imageLabel,
  tone = 'default',
}: EditorialPanelProps) {
  return (
    <section aria-labelledby={id} className={cn(tone === 'muted' && 'bg-muted/50')}>
      <Container className="py-section md:py-feature">
        <div className="grid items-center gap-8 md:grid-cols-2 md:gap-12 lg:gap-16">
          <div className={cn(imageSide === 'end' && 'md:order-2')}>
            <PlaceholderImage
              ratio="landscape"
              label={imageLabel ?? title}
              className="rounded-sm"
            />
          </div>

          <div>
            {eyebrow && (
              <p className="text-accent text-2xs tracking-snug mb-3 font-medium">{eyebrow}</p>
            )}

            <h2 id={id} className="font-display text-2xl tracking-tight text-balance md:text-3xl">
              {title}
            </h2>

            {/* Body steps up from `text-sm` to `text-base`. This is the one
                place on the homepage that asks to be READ rather than scanned,
                and 14px Hebrew in a half-width column is a paragraph people
                skip. */}
            <p className="text-muted-foreground mt-5 text-base text-pretty">{body}</p>

            {points && points.length > 0 && (
              <ul className="mt-6 space-y-2.5">
                {points.map((point) => (
                  <li key={point} className="flex gap-3 text-sm">
                    {/* Decorative marker. The list semantics carry the meaning. */}
                    <span
                      aria-hidden="true"
                      className="bg-accent mt-2 size-1 shrink-0 rounded-full"
                    />
                    <span className="text-muted-foreground">{point}</span>
                  </li>
                ))}
              </ul>
            )}

            {action && (
              <Button href={action.href} variant="secondary" className="mt-8">
                {action.label}
              </Button>
            )}
          </div>
        </div>
      </Container>
    </section>
  );
}
