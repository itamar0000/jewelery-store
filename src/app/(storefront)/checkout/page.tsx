import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { CheckoutFlow } from '@/components/checkout/CheckoutFlow';
import { cartLineToSummary } from '@/components/checkout/summary-lines';
import { Container } from '@/components/ui/Container';
import { includedVat } from '@/lib/cart/pricing';
import { getCartView } from '@/lib/cart/store';
import { CART_COOKIE } from '@/lib/cart/token';
import { estimatedPricesNote } from '@/lib/catalog/price-disclosure';
import { env } from '@/lib/env';
import { placeOrderAction } from '@/lib/orders/actions';
import { getPaymentProvider } from '@/lib/payments/provider';

export const metadata: Metadata = {
  title: 'השלמת ההזמנה',
  robots: { index: false, follow: false },
};

/**
 * The checkout.
 *
 * Only for a bag that can be ordered as it stands: an empty one, or one with
 * a line that has stopped being orderable, goes back to the cart, which says
 * why. Everything shown here is the cart resolved against the catalogue on
 * this request - the same resolution `placeOrder` repeats when the order is
 * placed, so the review and the order cannot disagree.
 */
export default async function CheckoutPage() {
  const cart = await getCartView((await cookies()).get(CART_COOKIE)?.value);
  if (cart.lines.length === 0 || cart.hasUnavailable) redirect('/cart');

  return (
    <Container className="py-10 md:py-14">
      <h1 className="font-display text-3xl font-normal tracking-tight md:text-4xl">השלמת ההזמנה</h1>

      <div className="mt-8">
        <CheckoutFlow
          lines={cart.lines.map(cartLineToSummary)}
          totals={{
            itemCount: cart.itemCount,
            subtotal: cart.subtotal,
            shipping: cart.shipping,
            total: cart.total,
            vat: includedVat(cart.total, env.VAT_RATE_BPS),
            discount: cart.discount,
            couponCode: cart.coupon?.applied ? cart.coupon.code : null,
          }}
          priceNote={estimatedPricesNote}
          paymentAvailable={getPaymentProvider() !== null}
          placeOrder={placeOrderAction}
        />
      </div>
    </Container>
  );
}
