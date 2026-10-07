import { hash } from '@node-rs/argon2';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetDb, testPrisma } from '@/test/db';

/**
 * Admin sign-in, against a real PostgreSQL (D4D.24).
 *
 * Only enabled staff get in; every refusal looks the same; and guessing is
 * capped per address and per network.
 */
vi.mock('@/lib/db', () => ({ prisma: testPrisma }));

const { checkSignIn, MAX_FAILURES_PER_EMAIL } = await import('./sign-in');

const PASSWORD = 'correct horse battery';

beforeEach(async () => {
  await resetDb();
  const passwordHash = await hash(PASSWORD);
  await testPrisma.user.createMany({
    data: [
      { email: 'owner@shop.test', role: 'ADMIN', passwordHash, displayName: 'בעלים' },
      { email: 'gone@shop.test', role: 'STAFF', passwordHash, disabledAt: new Date() },
      { email: 'buyer@shop.test', role: 'CUSTOMER', passwordHash },
    ],
  });
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

describe('checkSignIn', () => {
  it('lets enabled staff in, whatever the case of the address', async () => {
    const result = await checkSignIn('  Owner@Shop.test ', PASSWORD, '10.0.0.1');
    expect(result.ok).toBe(true);
  });

  it('gives one answer to a wrong password, an unknown address, a disabled member and a customer', async () => {
    for (const email of [
      'owner@shop.test',
      'nobody@shop.test',
      'gone@shop.test',
      'buyer@shop.test',
    ]) {
      const password = email === 'owner@shop.test' ? 'wrong password' : PASSWORD;
      expect(await checkSignIn(email, password, '10.0.0.2')).toEqual({
        ok: false,
        reason: 'invalid',
      });
    }
  });

  it('locks an address after repeated failures, even for the right password', async () => {
    for (let i = 0; i < MAX_FAILURES_PER_EMAIL; i += 1) {
      await checkSignIn('owner@shop.test', `wrong ${i}`, `10.0.1.${i}`);
    }
    expect(await checkSignIn('owner@shop.test', PASSWORD, '10.0.2.1')).toEqual({
      ok: false,
      reason: 'locked',
    });
  });

  it('stores no address in the clear', async () => {
    await checkSignIn('owner@shop.test', 'wrong', '203.0.113.9');
    const attempt = await testPrisma.loginAttempt.findFirstOrThrow();
    expect(attempt.ipHash).not.toContain('203.0.113.9');
    expect(attempt.ipHash).toHaveLength(64);
  });
});
