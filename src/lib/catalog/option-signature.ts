/**
 * Variant option signatures.
 *
 * A variant is defined by the set of option values it combines — "14K" +
 * "Yellow Gold". Nothing in a relational schema stops two variants of the same
 * product carrying an identical set: the join table constrains a variant's
 * values, not combinations across variants (DATA_MODEL_REVIEW F3). The result
 * would be two identical choices in the selector with stock split silently
 * between them.
 *
 * The fix is to denormalise the combination into a single deterministic string
 * and let PostgreSQL enforce `@@unique([productId, optionSignature])`.
 *
 * This module is the ONLY writer of that column. It is pure and has no database
 * dependency, so the encoding is testable on its own.
 */

/** Separator. A cuid contains no colon, so this cannot collide with an id. */
const SEPARATOR = ':';

/**
 * The signature of a variant that combines no option values.
 *
 * A product with no variant axes has exactly one variant, and the unique
 * constraint on `[productId, optionSignature]` means it can only ever have one
 * — which is correct.
 */
export const EMPTY_OPTION_SIGNATURE = '';

/**
 * Encode a set of `ProductOptionValue` ids as a canonical signature.
 *
 * Sorted, so the caller's ordering cannot produce two different signatures for
 * the same combination. De-duplicated, because a repeated id describes the same
 * combination and must not change the result.
 */
export function computeOptionSignature(optionValueIds: readonly string[]): string {
  const unique = [...new Set(optionValueIds)];
  unique.sort();
  return unique.join(SEPARATOR);
}

/**
 * True when two sets of option value ids describe the same combination,
 * regardless of the order they arrive in.
 */
export function isSameOptionCombination(a: readonly string[], b: readonly string[]): boolean {
  return computeOptionSignature(a) === computeOptionSignature(b);
}

/** Decode a signature back into its option value ids. */
export function parseOptionSignature(signature: string): string[] {
  if (signature === EMPTY_OPTION_SIGNATURE) return [];
  return signature.split(SEPARATOR);
}
