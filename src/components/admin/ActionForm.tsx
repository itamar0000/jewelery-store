'use client';

import { useActionState } from 'react';

import type { ActionState } from '@/lib/admin/panel-actions';

import { FormMessage, SubmitButton } from './form';

/**
 * A form posting to one admin server action, showing its result beside the
 * button. The fields are the children; the action re-checks the session.
 */
export function ActionForm({
  action,
  children,
  submitLabel,
  className,
}: {
  action: (state: ActionState, form: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  submitLabel: string;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, { ok: true, message: null });
  return (
    <form action={formAction} className={className}>
      {children}
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <SubmitButton>{submitLabel}</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
