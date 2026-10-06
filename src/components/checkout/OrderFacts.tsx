import { cn } from '@/components/ui/cn';
import type { PlacedOrderView } from '@/lib/orders/read';

/**
 * An order's reference facts, as ruled rows: its number, where it stands,
 * the address its email goes to, and where it ships.
 *
 * The number is set heaviest, because it is what a shopper quotes when they
 * ask about the order. The status is the order's own, read from the record -
 * never a hopeful default.
 */

const STATUS_LABELS: Readonly<Record<string, string>> = {
  PENDING_PAYMENT: 'ממתינה לתשלום',
  PAID: 'שולמה',
  PROCESSING: 'בהכנה',
  READY: 'מוכנה למשלוח',
  SHIPPED: 'נשלחה',
  DELIVERED: 'נמסרה',
  COMPLETED: 'הושלמה',
  CANCELLED: 'בוטלה',
  REFUNDED: 'הוחזר תשלום',
};

export function OrderFacts({ order, className }: { order: PlacedOrderView; className?: string }) {
  const rows: readonly { label: string; value: string; strong?: boolean; ltr?: boolean }[] = [
    { label: 'מספר הזמנה', value: order.orderNumber, strong: true, ltr: true },
    { label: 'מצב', value: STATUS_LABELS[order.status] ?? order.status },
    { label: 'אימייל', value: order.email, ltr: true },
    ...(order.shipTo
      ? [{ label: 'משלוח אל', value: `${order.shipTo.fullName}, ${order.shipTo.city}` }]
      : []),
  ];

  return (
    <dl className={cn('border-border divide-border divide-y border-y text-sm', className)}>
      {rows.map((row) => (
        <div key={row.label} className="flex items-baseline justify-between gap-6 py-3">
          <dt className="text-muted-foreground shrink-0">{row.label}</dt>
          <dd
            className={cn(
              'min-w-0 text-end break-words',
              row.strong && 'text-lg font-semibold tabular-nums',
            )}
          >
            {row.ltr ? <bdi>{row.value}</bdi> : row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
