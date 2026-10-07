import { hash, verify } from '@node-rs/argon2';

export { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, passwordProblem } from './password-rules';

/**
 * Admin passwords (ARCHITECTURE 7: Argon2id, never plaintext, never logged).
 *
 * The library's defaults are Argon2id with OWASP's recommended memory and
 * iteration cost, and the hash string records its own parameters, so raising
 * the cost later leaves every existing hash verifiable.
 */

export function hashPassword(password: string): Promise<string> {
  return hash(password);
}

/**
 * Hashed once and compared against when the email matches no one, so a
 * missing account takes as long to refuse as a wrong password. Without it the
 * response time alone tells a guesser which addresses are staff.
 */
let decoy: Promise<string> | null = null;

export async function verifyPassword(stored: string | null, password: string): Promise<boolean> {
  if (!stored) {
    decoy ??= hash('decoy-password-for-timing');
    await verify(await decoy, password).catch(() => false);
    return false;
  }
  try {
    return await verify(stored, password);
  } catch {
    // A malformed stored hash is a refusal, not a crash on the sign-in page.
    return false;
  }
}
