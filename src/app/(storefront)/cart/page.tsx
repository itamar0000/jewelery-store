import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';

import { CartLines, CartUndoArea } from '@/components/cart/CartLines';
import { CouponForm } from '@/components/cart/CouponForm';
import { SummaryTotalsTable } from '@/components/checkout/OrderSummary';
import { Button } from '@/components/ui/Button';
import { EditorialImage } from '@/components/ui/EditorialImage';
import { Container } from '@/components/ui/Container';
import {
  addToCartAction,
  applyCouponAction,
  removeCouponAction,
  removeCartItemAction,
  updateCartQuantityAction,
} from '@/lib/cart/actions';
import { includedVat } from '@/lib/cart/pricing';
import { getCartView } from '@/lib/cart/store';
import { CART_COOKIE } from '@/lib/cart/token';
import { estimatedPricesNote } from '@/lib/catalog/price-disclosure';
import { env } from '@/lib/env';
import { getPaymentProvider } from '@/lib/payments/provider';

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
      <h1 className="font-display text-3xl font-normal tracking-tight md:text-4xl">סל הקניות</h1>

      <CartUndoArea restore={addToCartAction}>
        {empty ? (
          <EmptyBag />
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
                totals={{
                  ...cart,
                  vat: includedVat(cart.total, env.VAT_RATE_BPS),
                  couponCode: cart.coupon?.applied ? cart.coupon.code : null,
                }}
                priceNote={estimatedPricesNote}
              />

              <CouponForm
                coupon={cart.coupon}
                apply={applyCouponAction}
                remove={removeCouponAction}
                className="border-border mt-5 border-t pt-5"
              />

              {unavailableCount > 0 ? (
                <p className="text-soft-foreground border-border mt-6 border-t pt-4 text-sm">
                  {unavailableCount === 1
                    ? 'פריט אחד בסל אינו זמין עוד להזמנה. כדי להמשיך, יש להסיר אותו.'
                    : `${unavailableCount} פריטים בסל אינם זמינים עוד להזמנה. כדי להמשיך, יש להסיר אותם.`}
                </p>
              ) : (
                <>
                  <Button href="/checkout" variant="primary" size="lg" className="mt-6 w-full">
                    להמשך ההזמנה
                  </Button>
                  {/*
                   * SAID HERE, NOT FIRST AT THE LAST STEP. The checkout told a
                   * shopper that payment is not live only on its review step,
                   * after name, phone and address (critique 2026-10-06). The bag
                   * says it before any of that is asked.
                   */}
                  {!getPaymentProvider() && (
                    <p className="text-soft-foreground mt-3 text-sm">
                      התשלום באתר עדיין לא פעיל: ההזמנה תישמר עם מספר, בלי חיוב.
                    </p>
                  )}
                </>
              )}
            </aside>
          </div>
        )}
      </CartUndoArea>
    </Container>
  );
}

/**
 * THE EMPTY BAG OPENS THE SHOP RATHER THAN CLOSING A SENTENCE. It was one
 * line and one button (critique 2026-10-06). It now shows the five
 * categories as the home page does - photograph, name on a rule beneath -
 * and the other way in: a piece made to order.
 */
const CATEGORIES = [
  { id: 'category-rings', label: 'טבעות', href: '/rings' },
  { id: 'category-earrings', label: 'עגילים', href: '/earrings' },
  { id: 'category-necklaces', label: 'שרשראות', href: '/necklaces' },
  { id: 'category-bracelets', label: 'צמידים', href: '/bracelets' },
  { id: 'category-sets', label: 'סטים', href: '/sets' },
] as const;

function EmptyBag() {
  return (
    <div className="border-border mt-8 border-t pt-8">
      <p className="text-soft-foreground text-base">הסל ריק. אפשר להתחיל מכאן:</p>

      <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
        {CATEGORIES.map((category) => (
          <li key={category.id}>
            <Link href={category.href} className="group block">
              <div className="relative aspect-[4/5] overflow-hidden">
                <EditorialImage
                  id={category.id}
                  sizes="(max-width: 639px) 50vw, (max-width: 1023px) 33vw, 20vw"
                  placeholderLabel={category.label}
                  className="ease-settle transition-transform duration-(--duration-drift) group-hover:scale-[1.03] motion-reduce:group-hover:scale-100"
                />
              </div>
              <p className="border-border mt-3 border-t pt-3 text-base font-medium group-hover:underline group-hover:underline-offset-[0.35em]">
                {category.label}
              </p>
            </Link>
          </li>
        ))}
      </ul>

      <p className="text-soft-foreground mt-10 text-sm">
        {'מחפשים משהו שלא בקטלוג? '}
        <Link
          href="/custom/request"
          className="decoration-border-strong hover:decoration-accent touch-target underline underline-offset-[0.35em]"
        >
          בקשה לעיצוב אישי
        </Link>
      </p>
    </div>
  );
}
