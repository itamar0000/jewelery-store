import { z } from 'zod';

import type { CustomFieldTypeValue } from '@/lib/personalization/snapshot';

/**
 * Personalization validation.
 *
 * Spec section 18 makes customization fields PER PRODUCT, so there is no fixed
 * schema to write. Instead the schema is BUILT from the product's
 * `CustomizationField` rows at request time, and the same built schema drives
 * the form and validates the submission — so the two cannot drift
 * (ARCHITECTURE section 4).
 *
 * Everything here runs on the server. A `pattern` or `maxLength` enforced only
 * in the browser is not enforced at all (spec section 48).
 */

export interface FieldRule {
  key: string;
  labelHe: string;
  fieldType: CustomFieldTypeValue;
  isRequired: boolean;
  maxLength: number | null;
  pattern: string | null;
  options: Array<{ value: string; labelHe: string }> | null;
}

/** Hard ceiling, applied even when a field declares no `maxLength`. */
const ABSOLUTE_MAX_LENGTH = 1000;

function buildFieldSchema(rule: FieldRule): z.ZodType<string | undefined> {
  if (rule.fieldType === 'SELECT' || rule.fieldType === 'LANGUAGE') {
    const allowed = (rule.options ?? []).map((option) => option.value);

    if (allowed.length === 0) {
      // A choice field with no choices cannot be satisfied. Failing loudly beats
      // silently accepting anything.
      return z.never(`Field "${rule.labelHe}" has no configured options.`) as z.ZodType<
        string | undefined
      >;
    }

    const base = z.string().refine((value) => allowed.includes(value), {
      message: `Select one of the available options for "${rule.labelHe}".`,
    });

    return (rule.isRequired ? base : base.optional()) as z.ZodType<string | undefined>;
  }

  let text = z.string().trim();

  if (rule.isRequired) {
    text = text.min(1, `"${rule.labelHe}" is required.`);
  }

  text = text.max(
    Math.min(rule.maxLength ?? ABSOLUTE_MAX_LENGTH, ABSOLUTE_MAX_LENGTH),
    `"${rule.labelHe}" is too long.`,
  );

  if (rule.pattern !== null && rule.pattern !== '') {
    // The pattern comes from admin-managed configuration, not from a customer.
    // An invalid pattern is a configuration error and must surface as one
    // rather than silently allowing everything through.
    let compiled: RegExp;
    try {
      compiled = new RegExp(rule.pattern);
    } catch {
      return z.never(`Field "${rule.labelHe}" has an invalid validation pattern.`) as z.ZodType<
        string | undefined
      >;
    }
    text = text.regex(compiled, `"${rule.labelHe}" is not in the expected format.`);
  }

  return (rule.isRequired ? text : text.optional()) as z.ZodType<string | undefined>;
}

/**
 * Build a validator for one product's personalization fields.
 *
 * `strict()` matters: an unrecognised key means the submission was not built
 * from this product's fields, which is either a stale form or tampering.
 * Either way it must be rejected, not silently dropped.
 */
export function buildPersonalizationSchema(rules: readonly FieldRule[]) {
  const shape: Record<string, z.ZodType<string | undefined>> = {};

  for (const rule of rules) {
    shape[rule.key] = buildFieldSchema(rule);
  }

  return z.object(shape).strict();
}

/**
 * Validate a submission against a product's fields.
 *
 * Returns a discriminated result rather than throwing, because failing
 * validation on a customer form is an expected outcome that the UI renders,
 * not an exception.
 */
export function validatePersonalization(
  rules: readonly FieldRule[],
  submitted: unknown,
):
  | { ok: true; values: Record<string, string> }
  | { ok: false; errors: Array<{ key: string; message: string }> } {
  const result = buildPersonalizationSchema(rules).safeParse(submitted ?? {});

  if (!result.success) {
    return {
      ok: false,
      errors: result.error.issues.map((issue) => ({
        key: issue.path.join('.') || '(root)',
        message: issue.message,
      })),
    };
  }

  const values: Record<string, string> = {};
  for (const [key, value] of Object.entries(result.data)) {
    if (typeof value === 'string' && value !== '') values[key] = value;
  }

  return { ok: true, values };
}
