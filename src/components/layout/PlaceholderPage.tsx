import { PageHero } from '@/components/storefront/PageHero';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { PLACEHOLDER_ATTR } from '@/lib/placeholders';

/**
 * A route that exists so a header control is not a dead link, but whose feature
 * has not been built.
 *
 * Cart, wishlist and account all point somewhere in the header. Leaving those
 * as 404s would make the shell look broken during review; pretending they work
 * would be worse. This page does neither - it names the feature, says plainly
 * that it is not built yet, and names the phase that builds it.
 *
 * It is marked with `data-placeholder`, so the whole set stays greppable
 * alongside the component-level placeholders (see @/lib/placeholders).
 */
export function PlaceholderPage({
  title,
  explanation,
  phase,
}: {
  title: string;
  explanation: string;
  phase: string;
}) {
  return (
    <>
      <PageHero
        title={title}
        trail={[{ label: 'דף הבית', href: '/' }, { label: title }]}
        imageLabel={title}
      />

      <Container className="py-12 md:py-16" {...PLACEHOLDER_ATTR}>
        <div className="border-border mx-auto max-w-(--container-prose) rounded-sm border border-dashed p-8 text-center">
          <p className="text-muted-foreground text-sm text-pretty">{explanation}</p>

          <p className="text-muted-foreground/70 text-2xs mt-6">{phase}</p>

          <Button href="/" variant="secondary" className="mt-8">
            חזרה לדף הבית
          </Button>
        </div>
      </Container>
    </>
  );
}
