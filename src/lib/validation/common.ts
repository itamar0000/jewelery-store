import { z } from 'zod';

import { MAX_AGOROT } from '@/lib/money';

/**
 * Shared validation primitives.
 *
 * ARCHITECTURE section 4: every mutation validates its input with a zod schema
 * ON THE SERVER, and the same schema powers the client form so the two cannot
 * drift. Client-side validation is a convenience; it is never the guarantee
 * (MASTER_SPECIFICATION section 48).
 *
 * These primitives exist so that "a price" or "a slug" means exactly one thing
 * everywhere in the application.
 */

/**
 * A monetary amount, in integer agorot.
 *
 * Bounded by the same sanity limit the money library uses, so a mistyped price
 * fails at the edge of the system rather than deep inside a total.
 */
export const agorot = z
  .int('Amount must be a whole number of agorot — never a decimal.')
  .min(0, 'Amount may not be negative.')
  .max(MAX_AGOROT, 'Amount exceeds the supported range.');

/** An optional monetary amount. */
export const optionalAgorot = agorot.nullish();

/** Basis points: 0–10000, i.e. 0%–100%. */
export const basisPoints = z
  .int('Percentage must be given in whole basis points.')
  .min(0)
  .max(10_000, 'Percentage may not exceed 100%.');

/** A positive whole quantity. A zero-quantity line is a deletion, not a row. */
export const quantity = z
  .int('Quantity must be a whole number.')
  .min(1, 'Quantity must be at least 1.')
  .max(999, 'Quantity is unreasonably large.');

/** Non-negative stock level. */
export const stockLevel = z.int().min(0, 'Stock may not be negative.').max(1_000_000);

/**
 * A URL slug: lowercase, digits and single hyphens.
 *
 * ASCII only, deliberately. Slugs are canonical URLs (section 44); Hebrew
 * percent-encodes into unreadable URLs that break when copied between
 * applications. The Hebrew name lives in `nameHe`.
 */
export const slug = z
  .string()
  .min(1, 'Slug is required.')
  .max(120)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'Slug may contain only lowercase letters, digits and single hyphens.',
  );

/**
 * A stable machine key for an option or customization field.
 * Examples: `gold_karat`, `ring_size`, `pendant_type`.
 */
export const machineKey = z
  .string()
  .min(1)
  .max(64)
  .regex(
    /^[a-z][a-z0-9_]*$/,
    'Key must start with a lowercase letter and contain only lowercase letters, digits and underscores.',
  );

/** Required Hebrew display text. */
export const hebrewText = (max = 200) =>
  z.string().trim().min(1, 'This field is required.').max(max);

/** Email, stored alongside its normalised form for case-insensitive matching. */
export const email = z.email('Enter a valid email address.').max(254);

/** Normalise an email for the indexed `emailNormalized` columns. */
export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Israeli phone number.
 *
 * Deliberately permissive: it accepts digits, spaces, hyphens and an optional
 * `+972`, and checks only that enough digits are present. A stricter pattern
 * rejects legitimate numbers and costs real orders; the specification fixes no
 * format.
 */
export const phone = z
  .string()
  .trim()
  .min(9, 'Enter a valid phone number.')
  .max(20)
  .regex(/^[+()\d\s-]+$/, 'Enter a valid phone number.')
  .refine((value) => value.replace(/\D/g, '').length >= 9, 'Enter a valid phone number.');

/** A cuid identifier. */
export const id = z.cuid('Invalid identifier.');

/** An object-storage key. Never a URL — the provider is TBD (TBD.md I1). */
export const storageKey = z.string().min(1).max(512);
