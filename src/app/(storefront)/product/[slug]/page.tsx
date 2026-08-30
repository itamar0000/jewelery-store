import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { Breadcrumbs } from '@/components/category/Breadcrumbs';
import { WishlistButton } from '@/components/product/WishlistButton';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { Badge } from '@/components/ui/Badge';
import { PlaceholderImage } from '@/components/ui/PlaceholderImage';
import { FIXTURE_PRODUCTS } from '@/lib/fixtures/catalog';
import { formatPrice } from '@/lib/money';
import { PLACEHOLDER_ATTR } from '@/lib/placeholders';

/**
 * Product page - STRUCTURAL PLACEHOLDER.
 *
 * Phase 3A exists to prove the shell, and the product page proper is Phase 4:
 * gallery, variant selection, gold karat and colour, sizes, personalization,
 * availability, made-to-order. None of that is here, and none of it is faked.
 *
 * What IS here is the minimum that makes the shell navigable: a card in a grid
 * links somewhere real, breadcrumbs continue to work, and the price renders
 * through the money module. The "add to cart" control is deliberately DISABLED
 * rather than inert-but-clickable - a button that looks live and silently does
 * nothing is the worst of the available options.
 */
export function generateStaticParams() {
  return FIXTURE_PRODUCTS.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = FIXTURE_PRODUCTS.find((candidate) => candidate.slug === slug);

  return product ? { title: product.name } : {};
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = FIXTURE_PRODUCTS.find((candidate) => candidate.slug === slug);

  if (!product) notFound();

  return (
    <Container className="py-8 md:py-10">
      <Breadcrumbs
        trail={[{ label: 'דף הבית', href: '/' }, { label: 'מוצרים' }, { label: product.name }]}
      />

      <div className="mt-8 grid gap-8 md:grid-cols-2 md:gap-12">
        <div className="relative">
          <PlaceholderImage
            ratio="square"
            label={product.imageAlt ?? product.name}
            className="rounded-sm"
          />
          <WishlistButton productName={product.name} className="absolute end-4 top-4 z-10" />
        </div>

        <div>
          {product.badges && product.badges.length > 0 && (
            <div className="mb-4 flex gap-2">
              {product.badges.map((badge) => (
                <Badge key={badge} tone={badge === 'made-to-order' ? 'info' : 'accent'}>
                  {badge === 'new' ? 'חדש' : badge === 'best-seller' ? 'רב מכר' : 'בהזמנה אישית'}
                </Badge>
              ))}
            </div>
          )}

          <h1 className="text-2xl tracking-tight">{product.name}</h1>

          <p className="mt-4 text-lg font-medium">{formatPrice(product.price)}</p>

          <div
            className="border-border mt-8 rounded-sm border border-dashed p-5"
            {...PLACEHOLDER_ATTR}
          >
            <p className="text-muted-foreground text-sm">
              בחירת גוון זהב, קראט, מידה והתאמה אישית — יתווספו בשלב 4. הדף הזה מציג כרגע מבנה בלבד.
            </p>
          </div>

          <Button
            variant="primary"
            size="lg"
            disabled
            className="mt-8 w-full"
            {...PLACEHOLDER_ATTR}
          >
            הוספה לסל — לא פעיל בשלב זה
          </Button>
        </div>
      </div>
    </Container>
  );
}
