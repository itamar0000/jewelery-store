import { createHash, randomBytes } from 'node:crypto';

/**
 * The two capabilities a guest's browser holds: its cart, and the order it
 * just placed.
 *
 * BOTH ARE RANDOM TOKENS, NOT IDENTIFIERS. A cart cookie carrying `Cart.id`
 * would need signing, because a cuid is structured enough to guess at; 192
 * random bits need nothing - the token is the credential, and a forged one
 * matches no row. That is also why no server secret is involved: there is
 * nothing to sign.
 *
 * The order token goes one step further. Only its SHA-256 is stored
 * (`Order.accessTokenHash`), so even a leaked database read cannot be turned
 * into a link to someone's order.
 *
 * Both cookies are httpOnly - no script on the page can read them - and
 * `SameSite=Lax`, so another site cannot post a mutation with them attached.
 */

export const CART_COOKIE = 'jfl_cart';
export const ORDER_COOKIE = 'jfl_order';

/** How long an untouched cart survives. Refreshed on every change. */
export const CART_TTL_DAYS = 30;
export const CART_TTL_MS = CART_TTL_DAYS * 24 * 60 * 60 * 1000;

/**
 * How long the order cookie lasts: long enough to come back to the payment
 * page in the same sitting, not a standing session.
 */
export const ORDER_COOKIE_MAX_AGE_SECONDS = 24 * 60 * 60;

/** 24 bytes, base64url: 32 characters, 192 bits. */
export function newToken(): string {
  return randomBytes(24).toString('base64url');
}

/**
 * Whether a cookie value could be a token this module issued.
 *
 * Checked before any query, so a malformed or oversized value never reaches
 * the database.
 */
export function isWellFormedToken(value: string | undefined | null): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{32}$/.test(value);
}

/** What `Order.accessTokenHash` stores. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function cookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: maxAgeSeconds,
  };
}
