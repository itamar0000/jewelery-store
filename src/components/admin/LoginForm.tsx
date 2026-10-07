'use client';

import { useActionState } from 'react';

import { signInAction, type SignInState } from '@/lib/admin/actions';

import { INPUT, LABEL, SubmitButton } from './form';

const ERRORS: Record<NonNullable<SignInState['error']>, string> = {
  missing: 'יש למלא אימייל וסיסמה.',
  invalid: 'האימייל או הסיסמה אינם נכונים.',
  locked: 'יותר מדי ניסיונות. נסו שוב בעוד רבע שעה.',
};

export function LoginForm() {
  const [state, action] = useActionState<SignInState, FormData>(signInAction, {
    error: null,
    email: '',
  });

  return (
    <form action={action} className="mt-8 space-y-5" noValidate>
      <div>
        <label htmlFor="admin-email" className={LABEL}>
          אימייל
        </label>
        <input
          id="admin-email"
          name="email"
          type="email"
          dir="ltr"
          autoComplete="username"
          required
          defaultValue={state.email}
          className={`${INPUT} mt-1.5`}
        />
      </div>
      <div>
        <label htmlFor="admin-password" className={LABEL}>
          סיסמה
        </label>
        <input
          id="admin-password"
          name="password"
          type="password"
          dir="ltr"
          autoComplete="current-password"
          required
          className={`${INPUT} mt-1.5`}
        />
      </div>
      {state.error && (
        <p role="alert" className="text-destructive text-sm">
          {ERRORS[state.error]}
        </p>
      )}
      <SubmitButton pendingLabel="נכנס…" className="w-full">
        כניסה
      </SubmitButton>
    </form>
  );
}
