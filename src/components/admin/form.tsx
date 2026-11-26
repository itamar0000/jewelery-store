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
  size = 'md',
  className,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'md' | 'lg';
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className={cn(
        'inline-flex items-center justify-center rounded-full font-semibold transition-colors disabled:opacity-60',
        size === 'lg' ? 'h-12 min-w-48 px-7 text-base' : 'h-10 px-5 text-sm',
        variant === 'primary' && 'bg-stamp text-stamp-foreground hover:bg-stamp-hover',
        variant === 'secondary' && 'border-border-field hover:border-accent border',
        variant === 'danger' &&
          'border-destructive/50 text-destructive hover:border-destructive border',
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
