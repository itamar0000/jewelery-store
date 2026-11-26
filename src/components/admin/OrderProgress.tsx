import type { OrderStatus } from '@/generated/prisma/client';
import { cn } from '@/components/ui/cn';
import { STAGES, stageIndex } from '@/lib/admin/order-steps';

/**
 * Where the order is, as a line of stages - readable at a glance, without
 * knowing what any status word means. Cancelled and refunded orders are off
 * the line and say so instead.
 */
export function OrderProgress({ status }: { status: OrderStatus }) {
  if (status === 'CANCELLED' || status === 'REFUNDED') {
    return (
      <p className="border-border bg-muted border px-4 py-3 text-sm font-medium">
        {status === 'CANCELLED' ? 'ההזמנה בוטלה.' : 'ההזמנה בוטלה והכסף הוחזר ללקוח.'}
      </p>
    );
  }

  const current = stageIndex(status);
  return (
    <ol
      aria-label="שלבי ההזמנה"
      className="grid grid-cols-3 gap-2 text-xs sm:grid-cols-6 sm:text-sm"
    >
      {STAGES.map((stage, index) => {
        const state = index < current ? 'past' : index === current ? 'current' : 'future';
        return (
          <li
            key={stage.status}
            aria-current={state === 'current' ? 'step' : undefined}
            className={cn(
              'border-t-4 pt-2',
              state === 'past' && 'border-success text-muted-foreground',
              state === 'current' && 'border-foreground font-bold',
              state === 'future' && 'border-border text-muted-foreground',
            )}
          >
            <span className="tabular-nums">{index + 1}. </span>
            {stage.label}
          </li>
        );
      })}
    </ol>
  );
}
