import { describe, expect, it } from 'vitest';

import {
  buildPersonalizationSnapshot,
  parsePersonalizationSnapshot,
  renderPersonalizationSnapshot,
  type FieldDefinition,
} from './snapshot';

const definitions: FieldDefinition[] = [
  { key: 'name', labelHe: 'שם לחריטה', fieldType: 'TEXT', position: 1 },
  {
    key: 'language',
    labelHe: 'שפה',
    fieldType: 'LANGUAGE',
    position: 2,
    options: [
      { value: 'he', labelHe: 'עברית' },
      { value: 'en', labelHe: 'אנגלית' },
    ],
  },
  { key: 'notes', labelHe: 'הערות', fieldType: 'TEXTAREA', position: 3 },
];

describe('buildPersonalizationSnapshot', () => {
  it('freezes the label and field type alongside the value', () => {
    const snapshot = buildPersonalizationSnapshot(definitions, { name: 'מיכל' });

    expect(snapshot).toEqual([
      { key: 'name', labelHe: 'שם לחריטה', fieldType: 'TEXT', value: 'מיכל', position: 1 },
    ]);
  });

  it('freezes the display label of a coded value', () => {
    // Storing "he" alone would leave the order page unable to render the
    // choice the customer actually made.
    const snapshot = buildPersonalizationSnapshot(definitions, { language: 'he' });

    expect(snapshot[0]?.value).toBe('he');
    expect(snapshot[0]?.valueLabelHe).toBe('עברית');
  });

  it('records fields in their configured order', () => {
    const snapshot = buildPersonalizationSnapshot(definitions, {
      notes: 'מתנה',
      name: 'מיכל',
      language: 'en',
    });

    expect(snapshot.map((entry) => entry.key)).toEqual(['name', 'language', 'notes']);
  });

  it('omits unanswered optional fields rather than storing empty strings', () => {
    const snapshot = buildPersonalizationSnapshot(definitions, { name: 'מיכל', notes: '' });
    expect(snapshot.map((entry) => entry.key)).toEqual(['name']);
  });

  it('drops values with no matching definition', () => {
    // An unrecognised key means the submission was not validated against this
    // product's fields.
    const snapshot = buildPersonalizationSnapshot(definitions, { name: 'מיכל', injected: 'x' });
    expect(snapshot.map((entry) => entry.key)).toEqual(['name']);
  });
});

describe('historical immutability', () => {
  /**
   * The requirement from data-model principle 11, stated as a test: an order's
   * personalization must render identically after the product's customization
   * configuration changes underneath it.
   */
  it('renders identically after the product configuration changes', () => {
    const atPurchase = buildPersonalizationSnapshot(definitions, {
      name: 'מיכל',
      language: 'he',
    });
    const renderedThen = renderPersonalizationSnapshot(atPurchase);

    // A year later the admin renames a field, deletes another, reorders the
    // rest, and changes what a code means.
    const laterDefinitions: FieldDefinition[] = [
      {
        key: 'language',
        labelHe: 'שפת החריטה',
        fieldType: 'LANGUAGE',
        position: 1,
        options: [{ value: 'he', labelHe: 'עברית (מודרנית)' }],
      },
      { key: 'name', labelHe: 'שם מלא לחריטה', fieldType: 'TEXT', position: 2 },
    ];

    // The configuration genuinely changed - otherwise this test proves nothing.
    expect(laterDefinitions.map((definition) => definition.labelHe)).not.toEqual(
      definitions.map((definition) => definition.labelHe),
    );
    // The order still renders from its own frozen snapshot, which never
    // consulted a definition to begin with.
    const renderedNow = renderPersonalizationSnapshot(atPurchase);

    expect(renderedNow).toEqual(renderedThen);
    expect(renderedNow).toEqual([
      { labelHe: 'שם לחריטה', displayValue: 'מיכל' },
      { labelHe: 'שפה', displayValue: 'עברית' },
    ]);
  });

  it('remains readable when the field definition is deleted entirely', () => {
    const snapshot = buildPersonalizationSnapshot(definitions, { name: 'מיכל' });
    // Nothing is passed but the snapshot itself.
    expect(renderPersonalizationSnapshot(snapshot)).toEqual([
      { labelHe: 'שם לחריטה', displayValue: 'מיכל' },
    ]);
  });
});

describe('renderPersonalizationSnapshot', () => {
  it('prefers the frozen display label over the raw code', () => {
    const snapshot = buildPersonalizationSnapshot(definitions, { language: 'en' });
    expect(renderPersonalizationSnapshot(snapshot)).toEqual([
      { labelHe: 'שפה', displayValue: 'אנגלית' },
    ]);
  });

  it('falls back to the raw value when there is no label', () => {
    const snapshot = buildPersonalizationSnapshot(definitions, { name: 'Michal' });
    expect(renderPersonalizationSnapshot(snapshot)).toEqual([
      { labelHe: 'שם לחריטה', displayValue: 'Michal' },
    ]);
  });

  it('does not mutate the snapshot it is given', () => {
    const snapshot = buildPersonalizationSnapshot(definitions, { notes: 'a', name: 'b' });
    const before = [...snapshot];
    renderPersonalizationSnapshot(snapshot);
    expect(snapshot).toEqual(before);
  });
});

describe('parsePersonalizationSnapshot', () => {
  it('reads a well-formed snapshot back', () => {
    const snapshot = buildPersonalizationSnapshot(definitions, { name: 'מיכל' });
    expect(parsePersonalizationSnapshot(snapshot)).toEqual(snapshot);
  });

  it('survives malformed stored JSON rather than breaking the order page', () => {
    expect(parsePersonalizationSnapshot(null)).toEqual([]);
    expect(parsePersonalizationSnapshot('nonsense')).toEqual([]);
    expect(parsePersonalizationSnapshot({ name: 'מיכל' })).toEqual([]);
    expect(parsePersonalizationSnapshot([{ key: 'name' }])).toEqual([]);
  });

  it('keeps the valid entries and skips only the broken ones', () => {
    const mixed = [
      { key: 'name', labelHe: 'שם', fieldType: 'TEXT', value: 'מיכל', position: 1 },
      { broken: true },
    ];
    expect(parsePersonalizationSnapshot(mixed)).toHaveLength(1);
  });
});
