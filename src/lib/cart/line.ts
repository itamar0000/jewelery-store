import { resolveImageUrl } from '@/lib/catalog/images';
import { toAvailability } from '@/lib/catalog/queries';
import type { Availability } from '@/lib/inventory/availability';
import { fromAgorot, type Money } from '@/lib/money';
import { parseFieldOptions } from '@/lib/personalization/field-options';
import type { FieldDefinition } from '@/lib/personalization/snapshot';
import { validatePersonalization, type FieldRule } from '@/lib/validation/personalization';

import { lineTotal } from './pricing';
import type { CartLineView, FieldProblem } from './types';

/**
 * One cart line, resolved against the catalogue as it stands right now.
 *
 * THE CART AND THE ORDER READ A LINE THE SAME WAY. The cart page, the checkout
 * summary and order creation all pass a row through `resolveLine`, so the
 * price a shopper reviews is the price the order records, and a line the cart
 * marks unavailable is exactly a line the order refuses. Two readers of the
 * same row with two sets of rules is how a cart and its order come to
 * disagree.
 *
 * NOTHING ON THE LINE IS TRUSTED AS STORED. The row holds what the shopper
 * chose - a variant, a quantity, the selections, the personalisation - and
 * every price, label and verdict is recomputed from the catalogue each time.
 * A price changed by the owner, a value withdrawn, a field made required: each
 * shows up on the next read.
 */

/** Non-axis options and the values a shopper may choose. */
export const selectionOptionsSelect = {
  where: { isVariantAxis: false },
  orderBy: { position: 'asc' },
  select: {
    code: true,
    nameHe: true,
    isRequired: true,
    values: {
      where: { isActive: true },
      orderBy: { position: 'asc' },
      select: { value: true, labelHe: true },
    },
  },
} as const;

/** A product's personalisation fields, with everything validation needs. */
export const customFieldsSelect = {
  orderBy: { position: 'asc' },
  select: {
    key: true,
    labelHe: true,
    fieldType: true,
    isRequired: true,
    maxLength: true,
    pattern: true,
    options: true,
    position: true,
    priceDeltaAgorot: true,
  },
} as const;

const inventorySelect = {
  select: { onHand: true, reserved: true, policy: true, lowStockThreshold: true },
} as const;

/** The one shape every cart read uses. */
export const cartItemSelect = {
  id: true,
  quantity: true,
  selections: true,
  customization: true,
  product: {
    select: {
      id: true,
      slug: true,
      nameHe: true,
      productType: true,
      basePriceAgorot: true,
      isActive: true,
      archivedAt: true,
      publishedAt: true,
      defaultPrepDays: true,
      lowStockThreshold: true,
      images: {
        where: { variantId: null },
        orderBy: { position: 'asc' },
        take: 1,
        select: { storageKey: true, altHe: true },
      },
      options: selectionOptionsSelect,
      customFields: customFieldsSelect,
      diamondSpec: { select: diamondSnapshotSelect() },
    },
  },
  variant: {
    select: {
      id: true,
      sku: true,
      isActive: true,
      archivedAt: true,
      priceAgorot: true,
      prepDays: true,
      inventory: inventorySelect,
      optionValues: {
        select: {
          value: {
            select: {
              value: true,
              labelHe: true,
              option: {
                select: { code: true, nameHe: true, position: true, isVariantAxis: true },
              },
            },
          },
        },
      },
      images: {
        orderBy: { position: 'asc' },
        take: 1,
        select: { storageKey: true, altHe: true },
      },
      diamondSpec: { select: diamondSnapshotSelect() },
    },
  },
} as const;

/** Diamond facts as an order freezes them, certificate included. */
function diamondSnapshotSelect() {
  return {
    isLabGrown: true,
    totalCaratWeight: true,
    stoneCount: true,
    color: true,
    clarity: true,
    cut: true,
    shape: true,
    certificate: { select: { issuer: true, number: true } },
  } as const;
}

// ------------------------------------------------------------------- shapes

interface SelectionOptionRow {
  code: string;
  nameHe: string;
  isRequired: boolean;
  values: { value: string; labelHe: string }[];
}

interface CustomFieldRow {
  key: string;
  labelHe: string;
  fieldType: string;
  isRequired: boolean;
  maxLength: number | null;
  pattern: string | null;
  options: unknown;
  position: number;
  priceDeltaAgorot: number;
}

interface InventoryRow {
  onHand: number;
  reserved: number;
  policy: string;
  lowStockThreshold: number | null;
}

interface DiamondRow {
  isLabGrown: boolean;
  totalCaratWeight: { toString(): string } | null;
  stoneCount: number | null;
  color: string | null;
  clarity: string | null;
  cut: string | null;
  shape: string | null;
  certificate: { issuer: string; number: string } | null;
}

/** A cart row as `cartItemSelect` reads it. */
export interface CartItemRow {
  id: string;
  quantity: number;
  selections: unknown;
  customization: unknown;
  product: {
    id: string;
    slug: string;
    nameHe: string;
    productType: string;
    basePriceAgorot: number;
    isActive: boolean;
    archivedAt: Date | null;
    publishedAt: Date | null;
    defaultPrepDays: number | null;
    lowStockThreshold: number | null;
    images: { storageKey: string; altHe: string }[];
    options: SelectionOptionRow[];
    customFields: CustomFieldRow[];
    diamondSpec: DiamondRow | null;
  };
  variant: {
    id: string;
    sku: string;
    isActive: boolean;
    archivedAt: Date | null;
    priceAgorot: number | null;
    prepDays: number | null;
    inventory: InventoryRow | null;
    optionValues: {
      value: {
        value: string;
        labelHe: string;
        option: { code: string; nameHe: string; position: number; isVariantAxis: boolean };
      };
    }[];
    images: { storageKey: string; altHe: string }[];
    diamondSpec: DiamondRow | null;
  };
}

/** A non-axis choice, as the cart and the order record it. */
export interface LineSelection {
  readonly optionCode: string;
  readonly optionLabelHe: string;
  readonly value: string;
  readonly valueLabelHe: string;
}

/** An axis value of the line's variant - gold colour, karat. */
export interface AxisValue {
  readonly code: string;
  readonly nameHe: string;
  readonly value: string;
  readonly labelHe: string;
}

export interface ResolvedLine {
  readonly view: CartLineView;
  /** Whether the line can be ordered exactly as it stands. */
  readonly orderable: boolean;
  readonly row: CartItemRow;
  readonly availability: Availability;
  readonly unitPrice: Money;
  readonly personalizationPrice: Money;
  readonly selections: readonly LineSelection[];
  /** Validated personalisation values, keyed by field. */
  readonly personalization: Readonly<Record<string, string>>;
  /** The field definitions in force, for the order's frozen snapshot. */
  readonly fieldDefinitions: readonly FieldDefinition[];
  readonly axisValues: readonly AxisValue[];
  readonly imageKey: string | null;
}

// --------------------------------------------------------------- validation

export type CheckResult<T> =
  | { readonly ok: true; readonly value: T }
  | {
      readonly ok: false;
      readonly problems: readonly FieldProblem[];
      /** A choice for something this product does not offer: a stale form, or tampering. */
      readonly foreign: boolean;
    };

/**
 * The shopper's non-axis choices, checked against the product's options.
 *
 * Returned in the product's own option order, labelled from the catalogue -
 * a label sent by the browser is never kept.
 */
export function checkSelections(
  options: readonly SelectionOptionRow[],
  submitted: readonly { optionCode: string; value: string }[],
): CheckResult<LineSelection[]> {
  const byCode = new Map(submitted.map((choice) => [choice.optionCode, choice.value]));
  const foreign = submitted.some(
    (choice) => !options.some((option) => option.code === choice.optionCode),
  );

  const problems: FieldProblem[] = [];
  const selections: LineSelection[] = [];

  for (const option of options) {
    const chosen = byCode.get(option.code);

    if (chosen === undefined || chosen === '') {
      if (option.isRequired) problems.push({ field: option.code, reason: 'missing' });
      continue;
    }

    const value = option.values.find((candidate) => candidate.value === chosen);
    if (!value) {
      problems.push({ field: option.code, reason: 'invalid' });
      continue;
    }

    selections.push({
      optionCode: option.code,
      optionLabelHe: option.nameHe,
      value: value.value,
      valueLabelHe: value.labelHe,
    });
  }

  if (problems.length > 0 || foreign) return { ok: false, problems, foreign };
  return { ok: true, value: selections };
}

/**
 * Personalisation, checked against the product's own fields.
 *
 * Empty answers are dropped before validation, so an optional field left
 * blank is simply absent and a required one reads as missing rather than as
 * malformed. The validator's messages are English and for logs; the shopper
 * is told in Hebrew by the form, from `reason`.
 */
export function checkPersonalization(
  fields: readonly CustomFieldRow[],
  submitted: Readonly<Record<string, string>>,
): CheckResult<Record<string, string>> {
  const answered: Record<string, string> = {};
  for (const [key, value] of Object.entries(submitted)) {
    if (value.trim() !== '') answered[key] = value;
  }

  const result = validatePersonalization(fields.map(toFieldRule), answered);
  if (result.ok) return { ok: true, value: canonicalRecord(result.values, fields) };

  const foreign = result.errors.some((error) => error.key === '(root)');
  const problems = result.errors
    .filter((error) => error.key !== '(root)')
    .map((error): FieldProblem => ({
      field: error.key,
      reason: answered[error.key] === undefined ? 'missing' : 'invalid',
    }));

  return { ok: false, problems, foreign };
}

/** Per-unit surcharge: the sum of the fields actually filled in. */
export function personalizationSurcharge(
  fields: readonly CustomFieldRow[],
  values: Readonly<Record<string, string>>,
): Money {
  const agorot = fields
    .filter((field) => values[field.key] !== undefined)
    .reduce((sum, field) => sum + field.priceDeltaAgorot, 0);
  return fromAgorot(agorot);
}

// ---------------------------------------------------------------- resolving

/**
 * Whether a variant can take `quantity` more units right now.
 *
 * Made to order sells past zero by design; a stocked (DENY) variant needs the
 * units. A variant with no inventory row cannot be reserved at all, so it is
 * not orderable - the same verdict `reserveInventory` would reach later, given
 * here first.
 */
export function canSupply(
  inventory: Pick<InventoryRow, 'onHand' | 'reserved' | 'policy'> | null,
  quantity: number,
): boolean {
  if (!inventory) return false;
  if (inventory.policy !== 'DENY') return true;
  return inventory.onHand - inventory.reserved >= quantity;
}

export function resolveLine(row: CartItemRow): ResolvedLine {
  const { product, variant } = row;

  const visible =
    product.isActive &&
    product.archivedAt === null &&
    product.publishedAt !== null &&
    variant.isActive &&
    variant.archivedAt === null;

  const availability = toAvailability(variant.inventory, {
    productThreshold: product.lowStockThreshold,
    productPrepDays: product.defaultPrepDays,
    variantPrepDays: variant.prepDays,
  });

  const storedSelections = parseStoredSelections(row.selections);
  const storedPersonalization = parseStoredPersonalization(row.customization);

  const selectionCheck = checkSelections(product.options, storedSelections);
  const personalizationCheck = checkPersonalization(product.customFields, storedPersonalization);

  const personalization = personalizationCheck.ok ? personalizationCheck.value : {};
  const unitPrice = fromAgorot(variant.priceAgorot ?? product.basePriceAgorot);
  const personalizationPrice = personalizationSurcharge(product.customFields, personalization);

  const orderable =
    visible &&
    canSupply(variant.inventory, row.quantity) &&
    selectionCheck.ok &&
    personalizationCheck.ok;

  const axisValues = variant.optionValues
    .map((link) => link.value)
    .filter((value) => value.option.isVariantAxis)
    .sort((a, b) => a.option.position - b.option.position)
    .map((value): AxisValue => ({
      code: value.option.code,
      nameHe: value.option.nameHe,
      value: value.value,
      labelHe: value.labelHe,
    }));

  // Selections as stored, relabelled from the catalogue where the value still
  // exists - so a line that has gone stale still says what was chosen.
  const selections: LineSelection[] = selectionCheck.ok
    ? selectionCheck.value
    : storedSelections.map((choice) => {
        const option = product.options.find((candidate) => candidate.code === choice.optionCode);
        const value = option?.values.find((candidate) => candidate.value === choice.value);
        return {
          optionCode: choice.optionCode,
          optionLabelHe: option?.nameHe ?? choice.optionLabelHe,
          value: choice.value,
          valueLabelHe: value?.labelHe ?? choice.valueLabelHe,
        };
      });

  const image = variant.images[0] ?? product.images[0] ?? null;

  const view: CartLineView = {
    id: row.id,
    productSlug: product.slug,
    productName: product.nameHe,
    imageUrl: image ? resolveImageUrl(image.storageKey) : null,
    imageAlt: image?.altHe || product.nameHe,
    variantLabel: axisValues.map((value) => value.labelHe).join(' · '),
    selections: selections.map((choice) => ({
      label: choice.optionLabelHe,
      value: choice.valueLabelHe,
    })),
    personalization: describePersonalization(
      product.customFields,
      personalizationCheck.ok ? personalization : storedPersonalization,
    ),
    quantity: row.quantity,
    unitPrice,
    personalizationPrice,
    lineTotal: lineTotal({ unitPrice, personalizationPrice, quantity: row.quantity }),
    leadTimeDays: availability.state === 'MADE_TO_ORDER' ? availability.prepDays : null,
    available: orderable,
  };

  return {
    view,
    orderable,
    row,
    availability,
    unitPrice,
    personalizationPrice,
    selections,
    personalization,
    fieldDefinitions: product.customFields.map((field) => ({
      key: field.key,
      labelHe: field.labelHe,
      fieldType: toFieldType(field.fieldType),
      position: field.position,
      options: parseFieldOptions(field.options),
    })),
    axisValues,
    imageKey: image?.storageKey ?? null,
  };
}

/**
 * The comparison key for "the same piece, configured the same way".
 *
 * Sorted, because the column is `jsonb` and PostgreSQL does not keep an
 * object's key order: the same choices can come back in a different sequence
 * from the one they were written in.
 */
export function configurationKey(
  variantId: string,
  selections: readonly { optionCode: string; value: string }[],
  personalization: Readonly<Record<string, string>>,
): string {
  return JSON.stringify([
    variantId,
    selections.map((choice) => [choice.optionCode, choice.value]).sort(),
    Object.entries(personalization).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
  ]);
}

// ------------------------------------------------------------------ parsing

/** `CartItem.selections`, read back defensively - it is a JSON column. */
export function parseStoredSelections(value: unknown): LineSelection[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry): LineSelection[] => {
    if (typeof entry !== 'object' || entry === null) return [];
    const candidate = entry as Record<string, unknown>;
    if (typeof candidate.optionCode !== 'string' || typeof candidate.value !== 'string') return [];

    return [
      {
        optionCode: candidate.optionCode,
        value: candidate.value,
        optionLabelHe:
          typeof candidate.optionLabelHe === 'string'
            ? candidate.optionLabelHe
            : candidate.optionCode,
        valueLabelHe:
          typeof candidate.valueLabelHe === 'string' ? candidate.valueLabelHe : candidate.value,
      },
    ];
  });
}

/**
 * `CartItem.customization`: the shopper's answers as a plain key/value map.
 *
 * A map, not the order's self-describing snapshot, because a cart line is
 * still being decided: it is re-validated against the current fields on every
 * read, and frozen into the snapshot shape only when the order is placed.
 */
export function parseStoredPersonalization(value: unknown): Record<string, string> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};

  const record: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === 'string') record[key] = entry;
  }
  return record;
}

function toFieldType(value: string): FieldRule['fieldType'] {
  return value === 'TEXTAREA' || value === 'SELECT' || value === 'LANGUAGE' ? value : 'TEXT';
}

function toFieldRule(field: CustomFieldRow): FieldRule {
  return {
    key: field.key,
    labelHe: field.labelHe,
    fieldType: toFieldType(field.fieldType),
    isRequired: field.isRequired,
    maxLength: field.maxLength,
    pattern: field.pattern,
    options: parseFieldOptions(field.options),
  };
}

/** Values in field order, so equal answers always serialise alike. */
function canonicalRecord(
  values: Readonly<Record<string, string>>,
  fields: readonly CustomFieldRow[],
): Record<string, string> {
  const record: Record<string, string> = {};
  for (const field of fields) {
    const value = values[field.key];
    if (value !== undefined) record[field.key] = value;
  }
  return record;
}

/** Label/value pairs for display, a choice shown by its label. */
function describePersonalization(
  fields: readonly CustomFieldRow[],
  values: Readonly<Record<string, string>>,
): { label: string; value: string }[] {
  return fields.flatMap((field) => {
    const value = values[field.key];
    if (value === undefined || value === '') return [];

    const option = parseFieldOptions(field.options)?.find((candidate) => candidate.value === value);
    return [{ label: field.labelHe, value: option?.labelHe ?? value }];
  });
}
