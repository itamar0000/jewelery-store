/**
 * Personalization snapshots.
 *
 * MASTER_SPECIFICATION principle 11: personalization submitted by a customer
 * must be IMMUTABLE within the finalized order record. Principle 9: historical
 * order data must not change when a product is later edited.
 *
 * A naive snapshot stores `{ name: "מיכל", lang: "he" }` — the values only.
 * That fails all four ways an order can later be misread
 * (DATA_MODEL_REVIEW F14):
 *
 *   - LABELS CHANGE. An admin renaming "שם" to "שם לחריטה" would retitle a
 *     two-year-old order.
 *   - FIELDS GET DELETED. A map keyed on `key` renders as an orphan value with
 *     no label once its definition is gone.
 *   - SELECT VALUES ARE CODES. `"he"` is meaningless without `"עברית"`.
 *   - ORDER MATTERS. An object gives no reliable ordering; the sequence the
 *     customer filled in is part of the record.
 *
 * So the snapshot is a SELF-DESCRIBING ARRAY. Everything needed to render the
 * line is frozen alongside the value, and rendering an order never reads a
 * `CustomizationField` row.
 */

export type CustomFieldTypeValue = 'TEXT' | 'TEXTAREA' | 'SELECT' | 'LANGUAGE';

/** One frozen answer, carrying its own label and type. */
export interface PersonalizationEntry {
  /** Stable machine key, for reporting and for matching across versions. */
  key: string;
  /** The label AS IT READ at purchase. */
  labelHe: string;
  fieldType: CustomFieldTypeValue;
  /** Exactly what the customer submitted. */
  value: string;
  /** Display text for a SELECT/LANGUAGE code, frozen so the code stays readable. */
  valueLabelHe?: string;
  /** Field order at purchase. */
  position: number;
}

/** The definition side, as it exists at the moment of purchase. */
export interface FieldDefinition {
  key: string;
  labelHe: string;
  fieldType: CustomFieldTypeValue;
  position: number;
  /** Allowed values for SELECT/LANGUAGE. */
  options?: Array<{ value: string; labelHe: string }> | null;
}

/**
 * Freeze submitted values against the definitions in force right now.
 *
 * Only fields the customer actually answered are recorded — an unanswered
 * optional field is absent from the order, not present as an empty string.
 *
 * Values arriving with no matching definition are DROPPED rather than stored:
 * they cannot be rendered meaningfully and, more importantly, an unrecognised
 * key means the submission was not validated against this product.
 */
export function buildPersonalizationSnapshot(
  definitions: readonly FieldDefinition[],
  submitted: Readonly<Record<string, string>>,
): PersonalizationEntry[] {
  const entries: PersonalizationEntry[] = [];

  for (const definition of definitions) {
    const value = submitted[definition.key];
    if (value === undefined || value === '') continue;

    const entry: PersonalizationEntry = {
      key: definition.key,
      labelHe: definition.labelHe,
      fieldType: definition.fieldType,
      value,
      position: definition.position,
    };

    const match = definition.options?.find((option) => option.value === value);
    if (match) entry.valueLabelHe = match.labelHe;

    entries.push(entry);
  }

  entries.sort((a, b) => a.position - b.position);
  return entries;
}

/**
 * The snapshot in the shape a Prisma `Json` column accepts.
 *
 * `PersonalizationEntry` is an interface with optional properties, which
 * Prisma's `InputJsonValue` rejects because it has no index signature. This is
 * the one conversion point, so no caller has to cast at a write site.
 */
export type StorablePersonalization = Array<Record<string, string | number>>;

export function toStorableSnapshot(
  entries: readonly PersonalizationEntry[],
): StorablePersonalization {
  return entries.map((entry) => {
    const record: Record<string, string | number> = {
      key: entry.key,
      labelHe: entry.labelHe,
      fieldType: entry.fieldType,
      value: entry.value,
      position: entry.position,
    };
    if (entry.valueLabelHe !== undefined) record.valueLabelHe = entry.valueLabelHe;
    return record;
  });
}

/**
 * Read a snapshot back for display.
 *
 * Takes the frozen JSON and returns label/value pairs. It consults nothing
 * else — that independence is the whole point, and it is what the immutability
 * test asserts.
 */
export function renderPersonalizationSnapshot(
  snapshot: readonly PersonalizationEntry[],
): Array<{ labelHe: string; displayValue: string }> {
  return [...snapshot]
    .sort((a, b) => a.position - b.position)
    .map((entry) => ({
      labelHe: entry.labelHe,
      displayValue: entry.valueLabelHe ?? entry.value,
    }));
}

/**
 * Narrow untrusted JSON read back from `OrderItem.customization`.
 *
 * The column is `Json`, so its runtime shape is not guaranteed by the type
 * system — rows may predate a change to this module. Malformed entries are
 * skipped rather than throwing, because a rendering bug must never make a
 * customer's order page unopenable.
 */
export function parsePersonalizationSnapshot(value: unknown): PersonalizationEntry[] {
  if (!Array.isArray(value)) return [];

  return value.filter((entry): entry is PersonalizationEntry => {
    if (typeof entry !== 'object' || entry === null) return false;
    const candidate = entry as Record<string, unknown>;
    return (
      typeof candidate.key === 'string' &&
      typeof candidate.labelHe === 'string' &&
      typeof candidate.fieldType === 'string' &&
      typeof candidate.value === 'string' &&
      typeof candidate.position === 'number'
    );
  });
}
