'use client';

import { useRouter } from 'next/navigation';
import { useId, useState, useTransition } from 'react';

import { cn } from '@/components/ui/cn';

/**
 * A coupon code on the bag (D4D.33).
 *
 * Folded away behind one line until the buyer has a code, so a bag without
 * one is not asking "do you have a discount?" of everyone. The server checks
 * the code against the bag and answers in words: applied, or why not.
 */
export function CouponForm({
  coupon,
  apply,
  remove,
  className,
}: {
  coupon: { code: string; applied: boolean; message: string | null } | null;
  apply: (code: string) => Promise<{ ok: true } | { ok: false; message: string }>;
  remove: () => Promise<void>;
  className?: string;
}) {
  const router = useRouter();
  const inputId = useId();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (coupon) {
    return (
      <div className={cn('text-sm', className)}>
        <p className="flex flex-wrap items-baseline justify-between gap-2">
          <span>
            קוד קופון <bdi className="font-medium">{coupon.code}</bdi>
            {coupon.applied ? ' הופעל.' : ''}
          </span>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await remove();
                router.refresh();
              })
            }
            className="text-muted-foreground hover:text-foreground touch-target underline underline-offset-[0.35em]"
          >
            הסרה
          </button>
        </p>
        {!coupon.applied && coupon.message && (
          <p role="status" className="text-warning mt-1.5">
            {coupon.message}
          </p>
        )}
      </div>
    );
  }

  if (!open) {
    return (
      <div className={className}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-soft-foreground hover:text-foreground touch-target text-sm underline underline-offset-[0.35em]"
        >
          יש לי קוד קופון
        </button>
      </div>
    );
  }

  return (
    <form
      className={className}
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await apply(code);
          if (result.ok) {
            setCode('');
            router.refresh();
          } else {
            setError(result.message);
          }
        });
      }}
    >
      <label htmlFor={inputId} className="text-sm font-medium">
        קוד קופון
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id={inputId}
          value={code}
          onChange={(event) => setCode(event.target.value)}
          dir="ltr"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={64}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className="border-input focus:border-accent min-w-0 flex-1 border-b bg-transparent py-2 text-base uppercase transition-colors"
        />
        <button
          type="submit"
          disabled={pending || !code.trim()}
          className="border-border-field hover:border-accent h-10 shrink-0 rounded-full border px-5 text-sm font-medium transition-colors disabled:opacity-50"
        >
          {pending ? 'בודק…' : 'הפעלה'}
        </button>
      </div>
      {error && (
        <p id={`${inputId}-error`} role="alert" className="text-destructive mt-2 text-sm">
          {error}
        </p>
      )}
    </form>
  );
}
