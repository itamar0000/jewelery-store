/**
 * The payment port.
 *
 * ONE INTERFACE, NO IMPLEMENTATION - YET. The checkout runs end to end up to
 * this boundary: an order is written as PENDING_PAYMENT, its stock is held,
 * and the shopper lands on /checkout/payment. What happens there depends on
 * `getPaymentProvider()`, which returns null because no provider has been
 * chosen (TBD.md B1). With null, the page says plainly that payment is not
 * available and that nothing was charged. Nothing anywhere pretends otherwise.
 *
 * ACTIVATING PAYMENT (IMPLEMENTATION_PLAN 6b) touches nothing else in the
 * flow:
 *   1. Implement `PaymentProvider` for the chosen gateway in this folder - a
 *      hosted page or redirect, so card details never touch this server
 *      (spec section 48, PCI scope).
 *   2. Return it from `getPaymentProvider()` when its credentials are set
 *      (add them to src/lib/env/schema.ts, optional, never defaulted).
 *   3. Add the gateway's webhook route. On a verified "paid" event, in one
 *      transaction: record a `Payment`, set the order PAID with an
 *      `OrderStatusEvent`, and `consumeReservation` for each of the order's
 *      holds (src/lib/inventory/reservation.ts). The webhook, never the
 *      return redirect, is what marks an order paid.
 *   4. /order/confirmation then renders for the paid order; it already exists
 *      and refuses anything unpaid.
 * Reservations already expire on their own (`expireReservations`), so an
 * abandoned payment returns its stock without further work.
 */

export interface PaymentRequest {
  /** The public order number, for the gateway's reference field. */
  readonly orderNumber: number;
  /** Agorot, VAT-inclusive, exactly as recorded on the order. */
  readonly totalAgorot: number;
  readonly currency: 'ILS';
  readonly email: string;
  readonly customerName: string;
  /** Where the gateway sends the shopper back to, success or not. */
  readonly returnUrl: string;
}

export interface PaymentProvider {
  /** Shown to staff and in logs, never to the shopper. */
  readonly name: string;
  /** Opens a hosted payment for an order awaiting payment; returns where to send the shopper. */
  startPayment(request: PaymentRequest): Promise<{ readonly redirectUrl: string }>;
}

/** The configured provider, or null while none is (TBD.md B1). */
export function getPaymentProvider(): PaymentProvider | null {
  return null;
}
