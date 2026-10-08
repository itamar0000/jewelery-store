'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

import {
  addItem,
  applyCoupon,
  removeCoupon,
  removeItem,
  setItemQuantity,
  type CouponResult,
} from './store';
import { CART_COOKIE, CART_TTL_DAYS, cookieOptions } from './token';
import type { CartMutationResult } from './types';

/**
 * The cart's server actions: the cookie in, the store, the cookie out.
 *
 * Thin on purpose. Validation, pricing and stock decisions live in ./store.ts,
 * which takes the token as an argument; these only read and write the cookie
 * and tell Next which views to rebuild. Revalidating the layout refreshes the
 * header's count on whatever page the shopper is on.
 */

const CART_MAX_AGE_SECONDS = CART_TTL_DAYS * 24 * 60 * 60;

export async function addToCartAction(input: unknown): Promise<CartMutationResult> {
  const jar = await cookies();
  const { result, token } = await addItem(jar.get(CART_COOKIE)?.value, input);

  if (token) jar.set(CART_COOKIE, token, cookieOptions(CART_MAX_AGE_SECONDS));
  if (result.ok) revalidatePath('/', 'layout');

  return result;
}

export async function updateCartQuantityAction(input: unknown): Promise<CartMutationResult> {
  const jar = await cookies();
  const result = await setItemQuantity(jar.get(CART_COOKIE)?.value, input);

  if (result.ok) revalidatePath('/', 'layout');
  return result;
}

export async function removeCartItemAction(cartItemId: unknown): Promise<CartMutationResult> {
  const jar = await cookies();
  const result = await removeItem(jar.get(CART_COOKIE)?.value, cartItemId);

  if (result.ok) revalidatePath('/', 'layout');
  return result;
}

export async function applyCouponAction(code: unknown): Promise<CouponResult> {
  const jar = await cookies();
  const result = await applyCoupon(jar.get(CART_COOKIE)?.value, code);
  if (result.ok) revalidatePath('/', 'layout');
  return result;
}

export async function removeCouponAction(): Promise<void> {
  const jar = await cookies();
  await removeCoupon(jar.get(CART_COOKIE)?.value);
  revalidatePath('/', 'layout');
}
