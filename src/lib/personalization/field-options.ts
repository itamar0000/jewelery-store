/**
 * `CustomizationField.options`, read back from its JSON column.
 *
 * A LANGUAGE or SELECT field stores its choices as `[{ value, labelHe }]`.
 * The column is `Json`, so the shape is not guaranteed by the type system:
 * malformed entries are skipped, and a field with no usable choice reads as
 * having none - which the validator then refuses loudly, rather than a
 * rendering bug accepting anything.
 */
export function parseFieldOptions(value: unknown): { value: string; labelHe: string }[] | null {
  if (!Array.isArray(value)) return null;

  const options = value.flatMap((entry) => {
    if (typeof entry !== 'object' || entry === null) return [];
    const candidate = entry as Record<string, unknown>;
    return typeof candidate.value === 'string' && typeof candidate.labelHe === 'string'
      ? [{ value: candidate.value, labelHe: candidate.labelHe }]
      : [];
  });

  return options.length > 0 ? options : null;
}
