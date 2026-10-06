import { cn } from '@/components/ui/cn';

/**
 * Where the shopper is in the checkout: details, delivery, review, payment.
 *
 * FOUR RULED CELLS, NOT A PROGRESS BAR. Each step sits under a rule that is a
 * hairline until it is reached and full ink from then on, so the row reads as
 * a docket being filled in - the same language as every other rule on the
 * site - rather than as a loading indicator. Steps already done are buttons
 * back to themselves; the current one is marked `aria-current="step"`.
 *
 * The fourth step is a page of its own (/checkout/payment). It appears here
 * from the start so the shopper knows payment comes after the review, and is
 * never a button: there is no going to it except by placing the order.
 */

export const CHECKOUT_STEPS = ['פרטים', 'משלוח', 'סיכום', 'תשלום'] as const;

export type CheckoutStep = 1 | 2 | 3 | 4;

export function CheckoutSteps({
  current,
  onSelect,
}: {
  current: CheckoutStep;
  /** Go back to a finished step. Without it, finished steps are plain text. */
  onSelect?: (step: CheckoutStep) => void;
}) {
  return (
    <ol className="grid grid-cols-4 gap-2 sm:gap-3">
      {CHECKOUT_STEPS.map((label, index) => {
        const step = (index + 1) as CheckoutStep;
        const reached = step <= current;
        const done = step < current;
        const content = (
          <>
            <span className="tabular-nums">{step}</span> {label}
          </>
        );

        return (
          <li
            key={label}
            aria-current={step === current ? 'step' : undefined}
            className={cn(
              'pt-2.5 text-sm',
              reached ? 'border-foreground border-t-2' : 'border-border mt-px border-t',
              step === current
                ? 'text-foreground font-semibold'
                : done
                  ? 'text-soft-foreground'
                  : 'text-muted-foreground',
            )}
          >
            {done && onSelect && step < 4 ? (
              <button
                type="button"
                onClick={() => onSelect(step)}
                className="decoration-border-strong hover:text-foreground touch-target underline underline-offset-[0.35em] transition-colors"
              >
                {content}
                <span className="sr-only"> (חזרה לשלב)</span>
              </button>
            ) : (
              content
            )}
          </li>
        );
      })}
    </ol>
  );
}
