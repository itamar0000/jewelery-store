'use client';

import { useFormStatus } from 'react-dom';

import { cn } from '@/components/ui/cn';

export { INPUT, LABEL } from './styles';

/**
 * The admin's form parts. Plain, dense and legible: this is a tool used daily
 * by a few people, so it shares the storefront's paper and ink but none of
 * its display type or editorial spacing.
 */

export function SubmitButton({
  children,
  pendingLabel = 'שומר…',
  variant = 'primary',
  className,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: 'primary' | 'secondary';
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className={cn(
        'inline-flex h-10 items-center justify-center rounded-full px-5 text-sm font-semibold transition-colors disabled:opacity-60',
        variant === 'primary'
          ? 'bg-stamp text-stamp-foreground hover:bg-stamp-hover'
          : 'border-border-field hover:border-accent border',
        className,
      )}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

export function FormMessage({ state }: { state: { ok: boolean; message: string | null } }) {
  if (!state.message) return null;
  return (
    <p
      role={state.ok ? 'status' : 'alert'}
      className={cn('text-sm', state.ok ? 'text-success' : 'text-destructive')}
    >
      {state.message}
    </p>
  );
}
