import type { Metadata } from 'next';
import { cookies } from 'next/headers';

import { CartLines } from '@/components/cart/CartLines';
import { SummaryTotalsTable } from '@/components/checkout/OrderSummary';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { removeCartItemAction, updateCartQuantityAction } from '@/lib/cart/actions';
import { includedVat } from '@/lib/cart/pricing';
import { getCartView } from '@/lib/cart/store';
import { CART_COOKIE } from '@/lib/cart/token';
import { estimatedPricesNote } from '@/lib/catalog/price-disclosure';
import { env } from '@/lib/env';

export const metadata: Metadata = {
  title: 'סל הקניות',
  robots: { index: false, follow: false },
};

/**
 * The bag.
 *
 * Read from the cart cookie on every request, priced on the server from the
 * catalogue as it stands now (src/lib/cart/line.ts). A line that can no
 * longer be ordered as configured stays visible and marked rather than
 * vanishing, and the way on to the checkout waits until it is removed: the
 * order is placed for exactly what the shopper sees, never for a quietly
 * trimmed version of it.
 */
export default async function CartPage() {
  const cart = await getCartView((await cookies()).get(CART_COOKIE)?.value);
  const empty = cart.lines.length === 0;
  const unavailableCount = cart.lines.filter((line) => !line.available).length;

  return (
    <Container className="py-10 md:py-14">
      <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">סל הקניות</h1>

      {empty ? (
        <div className="border-border mt-8 border-t pt-8">
          <p className="text-soft-foreground text-base">הסל ריק.</p>
          <Button href="/#discovery-heading" variant="secondary" className="mt-6">
            לכל הקטגוריות
          </Button>
        </div>
      ) : (
        <div className="mt-8 grid gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-8">
            <CartLines
              lines={cart.lines}
              updateQuantity={updateCartQuantityAction}
              remove={removeCartItemAction}
            />
          </div>

          <aside
            aria-labelledby="cart-summary-heading"
            className="lg:sticky lg:top-[calc(var(--header-height)+2rem)] lg:col-span-4 lg:self-start"
          >
            <h2 id="cart-summary-heading" className="text-base font-medium">
              סיכום
            </h2>

            <SummaryTotalsTable
              className="mt-4"
              totals={{ ...cart, vat: includedVat(cart.total, env.VAT_RATE_BPS) }}
              priceNote={estimatedPricesNote}
            />

            {unavailableCount > 0 ? (
              <p className="text-soft-foreground border-border mt-6 border-t pt-4 text-sm">
                {unavailableCount === 1
                  ? 'פריט אחד בסל אינו זמין עוד להזמנה. כדי להמשיך, יש להסיר אותו.'
                  : `${unavailableCount} פריטים בסל אינם זמינים עוד להזמנה. כדי להמשיך, יש להסיר אותם.`}
              </p>
            ) : (
              <Button href="/checkout" variant="primary" size="lg" className="mt-6 w-full">
                להמשך ההזמנה
              </Button>
            )}
          </aside>
        </div>
      )}
    </Container>
  );
}
