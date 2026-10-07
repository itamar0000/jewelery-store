'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { prisma } from '@/lib/db';

import { hashPassword, passwordProblem, verifyPassword } from './password';
import { endAdminSession, requireAdminAction, startAdminSession } from './session';
import { checkSignIn } from './sign-in';

export interface SignInState {
  readonly error: 'invalid' | 'locked' | 'missing' | null;
  readonly email: string;
}

/**
 * The client's address as the platform reports it. On Vercel the first entry
 * of x-forwarded-for is the client; anything later was appended by proxies.
 */
async function clientIp(): Promise<string | null> {
  const list = await headers();
  const forwarded = list.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || list.get('x-real-ip') || null;
}

export async function signInAction(_previous: SignInState, form: FormData): Promise<SignInState> {
  const email = String(form.get('email') ?? '').slice(0, 254);
  const password = String(form.get('password') ?? '').slice(0, 200);
  if (!email.trim() || !password) return { error: 'missing', email };

  const result = await checkSignIn(email, password, await clientIp());
  if (!result.ok) return { error: result.reason, email };

  await startAdminSession(result.userId);
  redirect('/admin/orders');
}

export interface PasswordState {
  readonly ok: boolean;
  readonly message: string | null;
}

/**
 * Change one's own password. Every other session of this person ends - a
 * password changed because it leaked must also lock out whoever holds it.
 */
export async function changePasswordAction(
  _previous: PasswordState,
  form: FormData,
): Promise<PasswordState> {
  const user = await requireAdminAction();
  const current = String(form.get('current') ?? '');
  const next = String(form.get('next') ?? '');
  const confirm = String(form.get('confirm') ?? '');

  const problem = passwordProblem(next);
  if (problem) return { ok: false, message: `הסיסמה החדשה: ${problem}.` };
  if (next !== confirm) return { ok: false, message: 'שתי הסיסמאות החדשות אינן זהות.' };

  const record = await prisma.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });
  if (!(await verifyPassword(record?.passwordHash ?? null, current))) {
    return { ok: false, message: 'הסיסמה הנוכחית אינה נכונה.' };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(next) },
    }),
    prisma.session.deleteMany({ where: { userId: user.id } }),
  ]);
  await startAdminSession(user.id);
  return { ok: true, message: 'הסיסמה עודכנה.' };
}

export async function signOutAction(): Promise<void> {
  await endAdminSession();
  redirect('/admin/login');
}
