'use client';

import Link from 'next/link';
import { createContext, use, useState, useTransition, type ReactNode } from 'react';

import { LineFacts } from '@/components/checkout/OrderSummary';
import { ProductPhoto } from '@/components/product/ProductPhoto';
import { cn } from '@/components/ui/cn';
import { MinusIcon, PlusIcon } from '@/components/ui/icons';
import { MAX_LINE_QUANTITY } from '@/lib/cart/pricing';
import type { AddToCartRequest, CartLineView, CartMutationResult } from '@/lib/cart/types';
import { add, formatPrice } from '@/lib/money';

/**
 * The bag's lines, each with its quantity and a way out of the bag.
 *
 * The actions arrive as props from the route (the cart's server actions), so
 * this component never imports the database and can be rendered on its own.
 * After each change the server re-renders the page with fresh figures -
 * nothing is recalculated here, so the line total on screen is always the
 * server's.
 */

type Update = (input: { cartItemId: string; quantity: number }) => Promise<CartMutationResult>;
type Remove = (cartItemId: string) => Promise<CartMutationResult>;
type Restore = (request: AddToCartRequest) => Promise<CartMutationResult>;

/**
 * UNDO FOR A REMOVAL (critique 2026-10-06). "הסרה" deleted the line at once,
 * engraving and all, with no way back short of configuring the piece again.
 * The removal now leaves a line that says what went and offers "ביטול",
 * which adds the same configuration back through the ordinary add - so it is
 * validated like any other, and refused in words if it can no longer be had.
 *
 * The notice lives ABOVE the lines, in `CartUndoArea`, which the bag page
 * renders in the same place whether or not the bag is now empty: removing the
 * last item swaps the lines for the empty bag, and the way back must survive
 * that.
 */
const RemovedContext = createContext<((name: string, request: AddToCartRequest) => void) | null>(
  null,
);

export function CartUndoArea({ restore, children }: { restore: Restore; children: ReactNode }) {
  const [removed, setRemoved] = useState<{ name: string; request: AddToCartRequest } | null>(null);
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);

  function undo() {
    if (!removed) return;
    setFailed(false);
    startTransition(async () => {
      try {
        const result = await restore(removed.request);
        if (result.ok) setRemoved(null);
        else setFailed(true);
      } catch {
        setFailed(true);
      }
    });
  }

  return (
    <RemovedContext value={(name, request) => setRemoved({ name, request })}>
      <div role="status" className="text-sm">
        {removed && (
          <span className="border-border mt-6 flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b pb-4">
            <span className="text-soft-foreground">
              {failed ? 'לא ניתן להחזיר את הפריט לסל כפי שהיה.' : `${removed.name} הוסר מהסל.`}
            </span>
            {!failed && (
              <button
                type="button"
                onClick={undo}
                disabled={pending}
                className="decoration-border-strong hover:decoration-accent touch-target font-semibold underline underline-offset-[0.35em]"
              >
                {pending ? 'מחזירים…' : 'ביטול'}
              </button>
            )}
          </span>
        )}
      </div>
      {children}
    </RemovedContext>
  );
}

const LINE_MESSAGES: Record<Exclude<CartMutationResult, { ok: true }>['error'], string> = {
  unavailable: 'אין כמות נוספת מהפריט הזה.',
  'not-found': 'הפריט כבר אינו בסל. כדאי לרענן את הדף.',
  invalid: 'השינוי לא נשמר. כדאי לרענן את הדף.',
  'needs-choices': 'השינוי לא נשמר. כדאי לרענן את הדף.',
};

export function CartLines({
  lines,
  updateQuantity,
  remove,
}: {
  lines: readonly CartLineView[];
  updateQuantity: Update;
  remove: Remove;
}) {
  return (
    <ul className="divide-border border-border divide-y border-y">
      {lines.map((line) => (
        <CartLine key={line.id} line={line} updateQuantity={updateQuantity} remove={remove} />
      ))}
    </ul>
  );
}

function CartLine({
  line,
  updateQuantity,
  remove,
}: {
  line: CartLineView;
  updateQuantity: Update;
  remove: Remove;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const announceRemoved = use(RemovedContext);
  const href = `/product/${line.productSlug}`;

  function run(action: () => Promise<CartMutationResult>) {
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await action();
        if (!result.ok) setMessage(LINE_MESSAGES[result.error]);
        else if (result.restore) announceRemoved?.(line.productName, result.restore);
      } catch {
        setMessage('השינוי לא נשמר. אפשר לנסות שוב.');
      }
    });
  }

  return (
    <li
      aria-busy={pending || undefined}
      className={cn('flex gap-4 py-6 transition-opacity sm:gap-6', pending && 'opacity-60')}
    >
      {/* The photograph repeats the name's link, so it is hidden from the
          keyboard and from screen readers: one link per line, not two. */}
      <Link href={href} tabIndex={-1} aria-hidden="true" className="w-24 shrink-0 sm:w-28">
        <ProductPhoto
          url={line.imageUrl}
          alt=""
          ratio="portrait"
          sizes="(min-width: 40rem) 112px, 96px"
          className={cn(!line.available && 'opacity-50')}
        />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-base font-medium text-balance">
            <Link href={href} className="hover:underline hover:underline-offset-[0.35em]">
              {line.productName}
            </Link>
          </h2>
          <p className={cn('shrink-0 tabular-nums', !line.available && 'text-muted-foreground')}>
            <bdi>{formatPrice(line.lineTotal)}</bdi>
          </p>
        </div>

        <LineFacts
          line={{
            id: line.id,
            name: line.productName,
            href,
            imageUrl: line.imageUrl,
            imageAlt: line.imageAlt,
            variantLabel: line.variantLabel,
            details: [...line.selections, ...line.personalization],
            // The stepper below states the quantity; the facts do not repeat it.
            quantity: 1,
            lineTotal: line.lineTotal,
            leadTimeDays: line.leadTimeDays,
          }}
        />

        {/* On sale: the sale named, and the unit's regular price struck (D4D.33). */}
        {line.promotionNameHe && line.regularUnitPrice && (
          <p className="text-accent mt-1 text-sm">
            מבצע: {line.promotionNameHe}{' '}
            <span className="text-muted-foreground line-through">
              <span className="sr-only">במקום </span>
              <bdi>{formatPrice(add(line.regularUnitPrice, line.personalizationPrice))}</bdi>
            </span>
          </p>
        )}

        {/* Per unit as the line charges it - engraving included - so the
            figure times the quantity is the line total beside it. */}
        {line.quantity > 1 && (
          <p className="text-muted-foreground mt-0.5 text-sm">
            <bdi>{formatPrice(add(line.unitPrice, line.personalizationPrice))}</bdi> ליחידה
          </p>
        )}

        {!line.available && (
          <p className="text-destructive mt-3 text-sm">
            הפריט אינו זמין עוד להזמנה כפי שנבחר, ואינו נכלל בסכום.
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
          {line.available && (
            <QuantityStepper
              name={line.productName}
              value={line.quantity}
              pending={pending}
              onChange={(quantity) => run(() => updateQuantity({ cartItemId: line.id, quantity }))}
            />
          )}

          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => remove(line.id))}
            className="decoration-border-strong hover:decoration-accent touch-target text-sm underline underline-offset-[0.35em] transition-colors"
          >
            הסרה
            <span className="sr-only"> של {line.productName} מהסל</span>
          </button>
        </div>

        {message && (
          <p role="alert" className="text-destructive mt-3 text-sm">
            {message}
          </p>
        )}
      </div>
    </li>
  );
}

/**
 * Minus, the figure, plus - in one ruled field like the secondary button.
 *
 * The ends are disabled at one and at the line maximum: there is nothing
 * below one but removal, which has its own control and name, and nothing
 * above the maximum the bag would accept.
 */
function QuantityStepper({
  name,
  value,
  pending,
  onChange,
}: {
  name: string;
  value: number;
  pending: boolean;
  onChange: (quantity: number) => void;
}) {
  const step =
    'hover:bg-muted inline-flex size-11 items-center justify-center transition-colors disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent';

  return (
    <div
      role="group"
      aria-label={`כמות של ${name}`}
      className="border-border-field inline-flex h-11 items-center border"
    >
      <button
        type="button"
        className={step}
        disabled={pending || value <= 1}
        onClick={() => onChange(value - 1)}
      >
        <MinusIcon className="size-4" />
        <span className="sr-only">אחד פחות</span>
      </button>
      <output aria-live="polite" className="w-8 text-center text-sm font-semibold tabular-nums">
        {value}
      </output>
      <button
        type="button"
        className={step}
        disabled={pending || value >= MAX_LINE_QUANTITY}
        onClick={() => onChange(value + 1)}
      >
        <PlusIcon className="size-4" />
        <span className="sr-only">אחד נוסף</span>
      </button>
    </div>
  );
}
