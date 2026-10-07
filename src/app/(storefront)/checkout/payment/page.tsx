import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { CheckoutSteps } from '@/components/checkout/CheckoutSteps';
import { OrderFacts } from '@/components/checkout/OrderFacts';
import { SummaryLines, SummaryTotalsTable } from '@/components/checkout/OrderSummary';
import { orderLineToSummary } from '@/components/checkout/summary-lines';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { ORDER_COOKIE } from '@/lib/cart/token';
import { estimatedPricesNote } from '@/lib/catalog/price-disclosure';
import { contactAvailable } from '@/lib/contact';
import { startPaymentAction } from '@/lib/orders/actions';
import { getOrderByAccessToken } from '@/lib/orders/read';
import { getPaymentProvider } from '@/lib/payments/provider';
import { PLACEHOLDER_ATTR } from '@/lib/placeholders';

export const metadata: Metadata = {
  title: 'תשלום',
  robots: { index: false, follow: false },
};

/**
 * The fourth step: payment - and, today, the end of the flow.
 *
 * The order exists by the time this renders: placed, priced, its stock held,
 * awaiting payment. What the page offers depends on whether a payment
 * provider is configured (src/lib/payments/provider.ts):
 *
 *   - WITH ONE, it hands the shopper to the provider's own payment page.
 *   - WITHOUT ONE - now - it says so in as many words: payment is not active,
 *     nothing was charged, and the pieces are not made until it is paid. It
 *     carries none of the signs of a completed purchase - no check mark, no
 *     thanks, no "your order is on its way" - because none of that is true.
 *
 * Reached only with the order cookie set when the order was placed; anyone
 * else is sent to the cart. A paid order belongs on the confirmation page.
 */
export default async function PaymentPage() {
  const order = await getOrderByAccessToken((await cookies()).get(ORDER_COOKIE)?.value);
  if (!order) redirect('/cart');
  if (order.paymentStatus === 'PAID') redirect('/order/confirmation');

  const provider = getPaymentProvider();
  const awaitingPayment = order.status === 'PENDING_PAYMENT';

  return (
    <Container className="py-10 md:py-14">
      <h1 className="font-display text-3xl font-normal tracking-tight md:text-4xl">השלמת ההזמנה</h1>

      <div className="mt-8 grid gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-7">
          <CheckoutSteps current={4} />

          <section aria-labelledby="payment-heading" className="mt-8">
            <h2
              id="payment-heading"
              className="font-display text-2xl font-normal tracking-tight text-balance"
            >
              {!awaitingPayment
                ? 'ההזמנה אינה ממתינה לתשלום'
                : provider
                  ? 'תשלום'
                  : 'ההזמנה נשמרה. התשלום עדיין לא פעיל.'}
            </h2>

            {awaitingPayment && provider && (
              <>
                <p className="text-soft-foreground mt-3 max-w-(--measure-reading) text-base">
                  ההזמנה נשמרה וממתינה לתשלום. התשלום מתבצע בעמוד של חברת הסליקה, ומשם חוזרים לכאן.
                </p>
                <form action={startPaymentAction} className="mt-8">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full sm:w-auto sm:min-w-64"
                  >
                    לתשלום
                  </Button>
                </form>
              </>
            )}

            {awaitingPayment && !provider && (
              <p
                className="text-soft-foreground mt-3 max-w-(--measure-reading) text-base"
                {...PLACEHOLDER_ATTR}
              >
                התשלום באתר עדיין לא פעיל, ולכן לא בוצע שום חיוב. ההזמנה שמורה וממתינה לתשלום,
                והתכשיטים לא ייכנסו להכנה עד שהתשלום יושלם.
              </p>
            )}

            <OrderFacts order={order} className="mt-8" />

            {contactAvailable && (
              <p className="text-soft-foreground mt-8 text-sm">
                לשאלות על ההזמנה אפשר ליצור קשר ולציין את מספר ההזמנה.
              </p>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              {contactAvailable && (
                <Button href="/contact" variant="secondary">
                  יצירת קשר
                </Button>
              )}
              <Button href="/" variant="secondary">
                לדף הבית
              </Button>
            </div>
          </section>
        </div>

        <aside aria-labelledby="payment-order-heading" className="lg:col-span-5">
          <h2 id="payment-order-heading" className="text-base font-medium">
            ההזמנה
          </h2>
          <div className="border-border mt-4 border-t pt-4">
            <SummaryLines lines={order.lines.map(orderLineToSummary)} />
          </div>
          <SummaryTotalsTable
            totals={order}
            priceNote={estimatedPricesNote}
            className="border-border mt-4 border-t pt-3"
          />
        </aside>
      </div>
    </Container>
  );
}
