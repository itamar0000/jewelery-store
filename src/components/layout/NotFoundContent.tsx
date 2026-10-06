import { PageHero } from '@/components/storefront/PageHero';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { NOT_FOUND_TITLE } from '@/lib/seo/not-found';

/**
 * What a 404 says, wherever it is raised: by `notFound()` from a product,
 * category or collection route (src/app/(storefront)/not-found.tsx), or by an
 * address that matches no route at all (src/app/not-found.tsx).
 */
export function NotFoundContent() {
  return (
    <>
      <PageHero
        title={NOT_FOUND_TITLE}
        size="compact"
        description="ייתכן שהכתובת השתנתה, או שהפריט אינו זמין יותר."
        trail={[{ label: 'דף הבית', href: '/' }, { label: NOT_FOUND_TITLE }]}
        imageLabel={NOT_FOUND_TITLE}
      />

      <Container className="py-12 md:py-16">
        <div className="mx-auto max-w-(--container-prose) text-center">
          <p className="text-muted-foreground text-sm">
            אפשר לחזור לדף הבית או לעבור לאחת הקטגוריות דרך התפריט למעלה.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button href="/" variant="primary">
              לדף הבית
            </Button>
            {/* It said "לקטלוג" and opened /rings; it now says what it opens. */}
            <Button href="/#discovery-heading" variant="secondary">
              לכל הקטגוריות
            </Button>
          </div>
        </div>
      </Container>
    </>
  );
}
