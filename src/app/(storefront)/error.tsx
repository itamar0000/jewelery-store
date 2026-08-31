'use client';

import { useEffect } from 'react';

import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';

/**
 * Storefront error boundary.
 *
 * Catches a failed render in any storefront route - most plausibly the database
 * being unreachable, which is exactly what happens in development when the
 * container is not running.
 *
 * WHAT IT DOES NOT DO IS SHOW THE ERROR. A customer cannot act on a Prisma
 * connection string, and error text is a common way to leak infrastructure
 * detail. The message stays generic; the real error goes to the server log
 * through the effect below, where an operator can actually read it.
 *
 * `reset()` re-runs the failed segment, which recovers without a full reload
 * once the underlying cause is fixed.
 */
export default function StorefrontError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Structured logging with no PII arrives with observability in Phase 9.
    console.error('Storefront render failed:', error);
  }, [error]);

  return (
    <Container className="py-20">
      <div className="border-border mx-auto max-w-(--container-prose) rounded-sm border p-8 text-center">
        <h1 className="text-2xl tracking-tight">משהו השתבש</h1>

        <p className="text-muted-foreground mt-4 text-sm text-pretty">
          לא הצלחנו לטעון את התוכן הזה כרגע. אפשר לנסות שוב, או לחזור לדף הבית.
        </p>

        {error.digest && (
          <p className="text-muted-foreground/70 text-2xs mt-4">מזהה תקלה: {error.digest}</p>
        )}

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button variant="primary" onClick={reset}>
            נסו שוב
          </Button>
          <Button href="/" variant="secondary">
            לדף הבית
          </Button>
        </div>
      </div>
    </Container>
  );
}
