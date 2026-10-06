import { cookies } from 'next/headers';
import type { ReactNode } from 'react';

import { getCartCount } from '@/lib/cart/store';
import { CART_COOKIE } from '@/lib/cart/token';
import { contactAvailable } from '@/lib/contact';

import { Footer } from './Footer';
import { Header } from './Header';
import { SkipLink } from './SkipLink';

/**
 * The storefront's frame: skip link, masthead, the page's single `<main>`
 * landmark (the skip link's target), footer.
 *
 * Shared by the storefront layout and the site-wide 404 (src/app/not-found.tsx),
 * because an address that matches no route at all is rendered outside every
 * route group - without this it got Next's bare, unstyled error page, with no
 * way back into the shop.
 *
 * THE CART COUNT IS READ HERE, per request, from the cart cookie. With no
 * cookie there is no query.
 */
export async function StorefrontShell({ children }: { children: ReactNode }) {
  const cartCount = await getCartCount((await cookies()).get(CART_COOKIE)?.value);

  return (
    <>
      <SkipLink />
      {/* The Header is a client component; the server tells it what exists. */}
      <Header contactAvailable={contactAvailable} cartCount={cartCount} />
      <main id="main-content">{children}</main>
      <Footer />
    </>
  );
}
