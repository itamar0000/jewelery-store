import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';

import { cookieOptions, hashToken, isWellFormedToken, newToken } from '@/lib/cart/token';
import { prisma } from '@/lib/db';

/**
 * Admin sessions (ARCHITECTURE 7 and 13, D4D.24).
 *
 * A DATABASE SESSION, NOT A SIGNED COOKIE. The cookie carries a random token;
 * the `Session` row holds only its SHA-256, an expiry and the user. Signing
 * out, disabling a staff member or changing a password deletes rows, and the
 * very next request is refused - a self-contained signed token would stay
 * valid until it expired.
 *
 * CHECKED ON EVERY READ. The middleware only turns away requests with no
 * cookie at all; whether the cookie is a live session of an enabled staff
 * member is decided here, by every admin page and every admin action
 * (ARCHITECTURE 6: gated in middleware AND re-checked in each action).
 */

export const ADMIN_COOKIE = 'jfl_admin';

/** A working week; signing in again weekly is not a burden for staff. */
export const ADMIN_SESSION_DAYS = 7;
const SESSION_MS = ADMIN_SESSION_DAYS * 24 * 60 * 60 * 1000;

export const ADMIN_ROLES = ['ADMIN', 'STAFF'] as const;

export interface AdminUser {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly role: (typeof ADMIN_ROLES)[number];
}

/** Opens a session for a user whose password was just verified. */
export async function startAdminSession(userId: string): Promise<void> {
  const token = newToken();
  await prisma.session.create({
    data: { sessionToken: hashToken(token), userId, expires: new Date(Date.now() + SESSION_MS) },
  });
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, token, cookieOptions(SESSION_MS / 1000));
}

export async function endAdminSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(ADMIN_COOKIE)?.value;
  if (isWellFormedToken(token)) {
    await prisma.session.deleteMany({ where: { sessionToken: hashToken(token) } });
  }
  jar.delete(ADMIN_COOKIE);
}

/**
 * The signed-in staff member, or null. Cached per request, so a page and the
 * components inside it share one lookup.
 */
export const getAdminUser = cache(async (): Promise<AdminUser | null> => {
  const jar = await cookies();
  const token = jar.get(ADMIN_COOKIE)?.value;
  if (!isWellFormedToken(token)) return null;

  const session = await prisma.session.findUnique({
    where: { sessionToken: hashToken(token) },
    select: {
      expires: true,
      user: {
        select: { id: true, email: true, displayName: true, role: true, disabledAt: true },
      },
    },
  });
  if (!session || session.expires.getTime() <= Date.now()) return null;

  const { user } = session;
  if (user.disabledAt) return null;
  if (user.role !== 'ADMIN' && user.role !== 'STAFF') return null;

  return { id: user.id, email: user.email, name: user.displayName ?? user.email, role: user.role };
});

/** For admin pages: the staff member, or a redirect to sign in. */
export async function requireAdminPage(): Promise<AdminUser> {
  const user = await getAdminUser();
  if (!user) redirect('/admin/login');
  return user;
}

export class AdminAuthError extends Error {
  constructor() {
    super('Not signed in to the admin.');
    this.name = 'AdminAuthError';
  }
}

/** For admin actions: the staff member, or a thrown refusal. */
export async function requireAdminAction(): Promise<AdminUser> {
  const user = await getAdminUser();
  if (!user) throw new AdminAuthError();
  return user;
}
