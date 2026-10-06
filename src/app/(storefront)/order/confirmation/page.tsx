import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { OrderFacts } from '@/components/checkout/OrderFacts';
import { SummaryLines, SummaryTotalsTable } from '@/components/checkout/OrderSummary';
import { orderLineToSummary } from '@/components/checkout/summary-lines';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { ORDER_COOKIE } from '@/lib/cart/token';
import { getOrderByAccessToken } from '@/lib/orders/read';

export const metadata: Metadata = {
  title: 'ההזמנה התקבלה',
  robots: { index: false, follow: false },
};

/**
 * The confirmation - for a PAID order and nothing else.
 *
 * Unreachable today, by design: no payment provider is configured, so no
 * order is ever paid (src/lib/payments/provider.ts). An unpaid order is sent
 * back to the payment page, so this page can never thank anyone for a
 * purchase that did not happen. It exists so that activating payment is the
 * provider adapter and its webhook, and nothing else.
 *
 * It promises nothing the business has not decided: no delivery date and no
 * confirmation email (TBD.md B5, I2) - only what the order record says.
 */
export default async function OrderConfirmationPage() {
  const order = await getOrderByAccessToken((await cookies()).get(ORDER_COOKIE)?.value);
  if (!order) redirect('/');
  if (order.paymentStatus !== 'PAID') redirect('/checkout/payment');

  return (
    <Container className="py-10 md:py-14">
      <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-7">
          <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
            ההזמנה התקבלה
          </h1>
          <p className="text-soft-foreground mt-3 max-w-(--measure-reading) text-base">
            התשלום התקבל וההזמנה בטיפול. כדאי לשמור את מספר ההזמנה לכל שאלה עליה.
          </p>

          <OrderFacts order={order} className="mt-8" />

          <Button href="/" variant="secondary" className="mt-8">
            לדף הבית
          </Button>
        </div>

        <aside aria-labelledby="confirmation-order-heading" className="lg:col-span-5">
          <h2 id="confirmation-order-heading" className="text-base font-medium">
            ההזמנה
          </h2>
          <div className="border-border mt-4 border-t pt-4">
            <SummaryLines lines={order.lines.map(orderLineToSummary)} />
          </div>
          <SummaryTotalsTable totals={order} className="border-border mt-4 border-t pt-3" />
        </aside>
      </div>
    </Container>
  );
}
