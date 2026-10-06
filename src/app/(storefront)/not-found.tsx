import type { Metadata } from 'next';

import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { PageHero } from '@/components/storefront/PageHero';

/**
 * Storefront 404.
 *
 * Reached by `notFound()` from a category, subcategory, product or collection
 * route, and by any unmatched storefront URL. Scoped to the `(storefront)`
 * group so it keeps the header and footer - a customer who mistypes a URL
 * should still be able to navigate, which a bare error page does not allow.
 */
/**
 * The tab says what happened. Without it a 404 carried the homepage's title,
 * so a mistyped link looked, in the tab and in history, like the front page.
 */
export const metadata: Metadata = { title: 'הדף לא נמצא' };

export default function StorefrontNotFound() {
  return (
    <>
      <PageHero
        title="הדף לא נמצא"
        size="compact"
        description="ייתכן שהכתובת השתנתה, או שהפריט אינו זמין יותר."
        trail={[{ label: 'דף הבית', href: '/' }, { label: 'הדף לא נמצא' }]}
        imageLabel="הדף לא נמצא"
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
