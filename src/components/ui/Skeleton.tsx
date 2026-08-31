import { cn } from './cn';

/**
 * A loading placeholder block.
 *
 * Used by the route-level `loading.tsx` files. It mirrors the SHAPE of the
 * content that is coming - a card grid stays a card grid - so the page does not
 * jump when the data lands. A centred spinner would be less work and a worse
 * experience, because it discards the layout information the browser could
 * already be painting.
 *
 * `aria-hidden`, and the containing region carries `aria-busy`: announcing a
 * dozen empty boxes to a screen reader is noise, and the busy state is the part
 * that carries meaning.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn('bg-muted rounded-sm motion-safe:animate-pulse', className)}
    />
  );
}

/** A grid of product-card-shaped skeletons. */
export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 md:grid-cols-3 lg:grid-cols-4"
    >
      <span className="sr-only">טוען מוצרים…</span>
      {Array.from({ length: count }, (_, index) => (
        <div key={index}>
          <Skeleton className="aspect-[4/5] w-full" />
          <Skeleton className="mt-3 h-4 w-3/4" />
          <Skeleton className="mt-2 h-4 w-1/3" />
        </div>
      ))}
    </div>
  );
}
