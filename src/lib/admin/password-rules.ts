/**
 * Password rules, apart from the hashing so a form in the browser can state
 * them without pulling the native Argon2 module into the client bundle.
 */

/** Long enough to resist guessing; no composition rules, which push people to "Password1!". */
export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 200;

export function passwordProblem(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) return `לפחות ${PASSWORD_MIN_LENGTH} תווים`;
  if (password.length > PASSWORD_MAX_LENGTH) return 'ארוכה מדי';
  return null;
}
