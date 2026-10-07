'use client';

import { useActionState } from 'react';

import { changePasswordAction, type PasswordState } from '@/lib/admin/actions';
import { PASSWORD_MIN_LENGTH } from '@/lib/admin/password-rules';

import { FormMessage, INPUT, LABEL, SubmitButton } from './form';

const FIELDS = [
  { name: 'current', label: 'סיסמה נוכחית', autoComplete: 'current-password' },
  {
    name: 'next',
    label: `סיסמה חדשה (לפחות ${PASSWORD_MIN_LENGTH} תווים)`,
    autoComplete: 'new-password',
  },
  { name: 'confirm', label: 'הסיסמה החדשה שוב', autoComplete: 'new-password' },
] as const;

export function PasswordForm() {
  const [state, action] = useActionState<PasswordState, FormData>(changePasswordAction, {
    ok: true,
    message: null,
  });
  return (
    <form action={action} className="mt-4 space-y-4">
      {FIELDS.map((field) => (
        <div key={field.name}>
          <label htmlFor={`password-${field.name}`} className={LABEL}>
            {field.label}
          </label>
          <input
            id={`password-${field.name}`}
            name={field.name}
            type="password"
            dir="ltr"
            required
            autoComplete={field.autoComplete}
            className={`${INPUT} mt-1.5`}
          />
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-4">
        <SubmitButton>החלפה</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
