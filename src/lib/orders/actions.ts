'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import {
  CART_COOKIE,
  ORDER_COOKIE,
  ORDER_COOKIE_MAX_AGE_SECONDS,
  cookieOptions,
} from '@/lib/cart/token';
import { env } from '@/lib/env';
import { getPaymentProvider } from '@/lib/payments/provider';

import { placeOrder, type PlaceOrderResult } from './place-order';
import { getPayableOrder } from './read';

/**
 * Placing the order, then the hand-off to payment.
 *
 * On success this never returns: it stores the order's access token in an
 * httpOnly cookie and redirects to /checkout/payment, which reads the order
 * back by that token. On failure it returns the reason for the form to show.
 * (`redirect` throws, which is why it is called outside any try.)
 */
export async function placeOrderAction(
  input: unknown,
): Promise<Exclude<PlaceOrderResult, { ok: true }>> {
  const jar = await cookies();
  const result = await placeOrder(jar.get(CART_COOKIE)?.value, input, {
    vatRateBps: env.VAT_RATE_BPS ?? null,
  });

  if (!result.ok) return result;

  jar.set(ORDER_COOKIE, result.accessToken, cookieOptions(ORDER_COOKIE_MAX_AGE_SECONDS));
  revalidatePath('/', 'layout');
  redirect('/checkout/payment');
}

/**
 * Send the shopper to the payment provider for the order they just placed.
 *
 * Only reachable once `getPaymentProvider()` returns one; until then the
 * payment page offers no control that calls this, and a direct call goes
 * straight back to that page.
 */
export async function startPaymentAction(): Promise<void> {
  const provider = getPaymentProvider();
  const jar = await cookies();
  const order = provider ? await getPayableOrder(jar.get(ORDER_COOKIE)?.value) : null;

  if (!provider || !order) redirect('/checkout/payment');

  const { redirectUrl } = await provider.startPayment({
    orderNumber: order.orderNumber,
    totalAgorot: order.totalAgorot,
    currency: 'ILS',
    email: order.email,
    customerName: order.customerName,
    returnUrl: new URL('/checkout/payment', env.NEXT_PUBLIC_SITE_URL).toString(),
  });

  redirect(redirectUrl);
}
