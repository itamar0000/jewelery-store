import { createHash } from 'node:crypto';

import { prisma } from '@/lib/db';

import { verifyPassword } from './password';

/**
 * Checking an admin sign-in, with a ceiling on guessing (ARCHITECTURE 6).
 *
 * TWO LIMITS, BOTH COUNTED IN THE DATABASE. Five wrong passwords for one
 * address in fifteen minutes locks that address; thirty from one network
 * locks the network, so a guesser cannot just rotate addresses. Counting in
 * the database rather than in memory is what makes this hold on serverless,
 * where every request may land on a fresh instance.
 *
 * ONE ANSWER FOR EVERY REFUSAL. A wrong password, an unknown address, a
 * disabled staff member and a customer account all get "invalid", so the form
 * never confirms which addresses belong to staff.
 */

export const WINDOW_MS = 15 * 60 * 1000;
export const MAX_FAILURES_PER_EMAIL = 5;
export const MAX_FAILURES_PER_IP = 30;

export type SignInResult =
  | { readonly ok: true; readonly userId: string }
  | { readonly ok: false; readonly reason: 'invalid' | 'locked' };

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function hashIp(ip: string | null): string | null {
  return ip ? createHash('sha256').update(`admin-ip:${ip}`).digest('hex') : null;
}

export async function checkSignIn(
  email: string,
  password: string,
  ip: string | null,
): Promise<SignInResult> {
  const emailNormalized = normalizeEmail(email);
  const ipHash = hashIp(ip);
  const since = new Date(Date.now() - WINDOW_MS);

  const [emailFailures, ipFailures] = await Promise.all([
    prisma.loginAttempt.count({
      where: { emailNormalized, succeeded: false, createdAt: { gte: since } },
    }),
    ipHash
      ? prisma.loginAttempt.count({
          where: { ipHash, succeeded: false, createdAt: { gte: since } },
        })
      : 0,
  ]);
  if (emailFailures >= MAX_FAILURES_PER_EMAIL || ipFailures >= MAX_FAILURES_PER_IP) {
    return { ok: false, reason: 'locked' };
  }

  const user = await prisma.user.findUnique({
    where: { email: emailNormalized },
    select: { id: true, passwordHash: true, role: true, disabledAt: true },
  });
  const eligible = user && !user.disabledAt && (user.role === 'ADMIN' || user.role === 'STAFF');
  const matches = await verifyPassword(eligible ? user.passwordHash : null, password);

  await prisma.loginAttempt.create({ data: { emailNormalized, ipHash, succeeded: matches } });

  return matches && user ? { ok: true, userId: user.id } : { ok: false, reason: 'invalid' };
}
