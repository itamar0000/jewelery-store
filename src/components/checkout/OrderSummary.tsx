import Link from 'next/link';

import { ProductPhoto } from '@/components/product/ProductPhoto';
import { cn } from '@/components/ui/cn';
import { itemCountLabel, leadTimeLabel } from '@/lib/cart/messages';
import { formatPrice, isZero, type Money } from '@/lib/money';

/**
 * What is being bought, and what it comes to.
 *
 * One drawing for the checkout's side column and the payment page, so the
 * figures a shopper reviews and the figures on the order they placed are set
 * the same way and can be compared at a glance. Every amount arrives computed
 * on the server; nothing here adds anything up.
 *
 * A LEDGER, NOT CARDS. Lines are separated by hairlines and nothing else -
 * the way an invoice or a jeweller's docket is ruled - with the figure at the
 * inline end of each row.
 */

export interface SummaryLine {
  readonly id: string;
  readonly name: string;
  /** The product page, while the piece is still in the catalogue. */
  readonly href: string | null;
  readonly imageUrl: string | null;
  readonly imageAlt: string;
  readonly variantLabel: string;
  readonly details: readonly { readonly label: string; readonly value: string }[];
  readonly quantity: number;
  readonly lineTotal: Money;
  readonly leadTimeDays: number | null;
}

export interface SummaryTotals {
  readonly itemCount: number;
  readonly subtotal: Money;
  readonly shipping: Money;
  readonly total: Money;
  /** The VAT inside the total, when a rate is configured; null otherwise. */
  readonly vat: Money | null;
}

export function SummaryLines({ lines }: { lines: readonly SummaryLine[] }) {
  return (
    <ul className="divide-border divide-y">
      {lines.map((line) => (
        <li key={line.id} className="flex gap-4 py-4 first:pt-0">
          <div className="w-16 shrink-0">
            <ProductPhoto url={line.imageUrl} alt={line.imageAlt} ratio="portrait" sizes="64px" />
          </div>

          <div className="min-w-0 flex-1 text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-medium">
                {line.href ? (
                  <Link
                    href={line.href}
                    className="hover:underline hover:underline-offset-[0.35em]"
                  >
                    {line.name}
                  </Link>
                ) : (
                  line.name
                )}
              </p>
              <p className="shrink-0 tabular-nums">
                <bdi>{formatPrice(line.lineTotal)}</bdi>
              </p>
            </div>

            <LineFacts line={line} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Variant, choices, personalisation, quantity and lead time, in that order. */
export function LineFacts({ line, className }: { line: SummaryLine; className?: string }) {
  return (
    <div className={cn('text-muted-foreground mt-1 space-y-0.5 text-sm', className)}>
      {line.variantLabel && <p>{line.variantLabel}</p>}
      {line.details.map((detail) => (
        <p key={detail.label}>
          {detail.label}: <bdi className="text-soft-foreground">{detail.value}</bdi>
        </p>
      ))}
      {line.quantity > 1 && <p>כמות: {line.quantity}</p>}
      {line.leadTimeDays !== null && <p>{leadTimeLabel(line.leadTimeDays)}</p>}
    </div>
  );
}

export function SummaryTotalsTable({
  totals,
  priceNote = null,
  className,
}: {
  totals: SummaryTotals;
  /** "המחירים משוערים" while prices are placeholders (price-disclosure.ts). */
  priceNote?: string | null;
  className?: string;
}) {
  return (
    <div className={className}>
      <dl className="text-sm">
        <div className="flex justify-between gap-4 py-1.5">
          <dt className="text-soft-foreground">סכום ביניים · {itemCountLabel(totals.itemCount)}</dt>
          <dd className="tabular-nums">
            <bdi>{formatPrice(totals.subtotal)}</bdi>
          </dd>
        </div>
        <div className="flex justify-between gap-4 py-1.5">
          <dt className="text-soft-foreground">משלוח</dt>
          <dd className="tabular-nums">
            {isZero(totals.shipping) ? 'חינם' : <bdi>{formatPrice(totals.shipping)}</bdi>}
          </dd>
        </div>
        <div className="border-foreground mt-2 flex items-baseline justify-between gap-4 border-t pt-3">
          <dt className="text-base font-semibold">סה״כ</dt>
          <dd className="text-xl font-semibold tracking-tight tabular-nums">
            <bdi>{formatPrice(totals.total)}</bdi>
          </dd>
        </div>
      </dl>

      {(totals.vat !== null || priceNote) && (
        <p className="text-muted-foreground mt-2 text-xs">
          {totals.vat !== null && (
            <>
              כולל מע״מ <bdi>{formatPrice(totals.vat)}</bdi>
            </>
          )}
          {totals.vat !== null && priceNote && ' · '}
          {priceNote}
        </p>
      )}
    </div>
  );
}
