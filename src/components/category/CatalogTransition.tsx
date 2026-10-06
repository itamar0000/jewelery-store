'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  createContext,
  useContext,
  useTransition,
  type ComponentProps,
  type MouseEvent,
  type ReactNode,
} from 'react';

import { cn } from '@/components/ui/cn';

/**
 * Filter, sort and page changes as one transition.
 *
 * THE PROBLEM IT SOLVES. The listing used to sit in a Suspense boundary keyed
 * on the query string, so every filter tap REMOUNTED it: the skeleton flashed,
 * and the filter drawer - which lives in the same subtree - closed, collapsed
 * its groups and lost its scroll and focus. A shopper choosing two colours on a
 * phone had to reopen the drawer and find the group again after the first.
 *
 * NOW NOTHING REMOUNTS. A change navigates inside a React transition, so the
 * page keeps showing the current results until the next ones are ready, and the
 * drawer stays exactly as the shopper left it, with its count updated. What the
 * skeleton used to say - "something is loading" - is said by the results
 * themselves: dimmed and marked `aria-busy` while the transition runs.
 *
 * Links stay links. `CatalogLink` renders a real `<a href>`, so a filter still
 * works without JavaScript, opens in a new tab and copies as a URL; only a
 * plain left click is taken over.
 */

interface CatalogNavigation {
  readonly pending: boolean;
  readonly navigate: (href: string, options?: { readonly scroll?: boolean }) => void;
}

const NavigationContext = createContext<CatalogNavigation | null>(null);

export function CatalogTransition({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const navigate: CatalogNavigation['navigate'] = (href, options = {}) => {
    startTransition(() => router.push(href, { scroll: options.scroll ?? false }));
  };

  return <NavigationContext value={{ pending, navigate }}>{children}</NavigationContext>;
}

/** The transition, or null outside one - where links simply navigate. */
export function useCatalogNavigation(): CatalogNavigation | null {
  return useContext(NavigationContext);
}

/** Clicks a link should leave to the browser: new tab, new window, download. */
function isModified(event: MouseEvent<HTMLAnchorElement>): boolean {
  return (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  );
}

/**
 * A `<Link>` that navigates inside the catalogue transition.
 *
 * `scroll` defaults to false, as every filter link's did: a filter changes the
 * results, not the reader's place on the page. Pagination passes true with a
 * `#results` anchor, so a new page starts at the top of the grid.
 */
export function CatalogLink({
  href,
  scroll = false,
  onClick,
  ...rest
}: Omit<ComponentProps<typeof Link>, 'href'> & { href: string }) {
  const navigation = useCatalogNavigation();

  return (
    <Link
      href={href}
      scroll={scroll}
      onClick={(event) => {
        onClick?.(event);
        if (!navigation || isModified(event)) return;
        event.preventDefault();
        navigation.navigate(href, { scroll });
      }}
      {...rest}
    />
  );
}

/** The results, dimmed and marked busy while the next set is on its way. */
export function PendingResults({ children }: { children: ReactNode }) {
  const pending = useCatalogNavigation()?.pending ?? false;

  return (
    <div
      aria-busy={pending || undefined}
      className={cn(
        'ease-settle transition-opacity duration-(--duration-settle)',
        pending && 'opacity-45',
      )}
    >
      {children}
    </div>
  );
}
