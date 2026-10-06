import { describe, expect, it } from 'vitest';

import {
  PURCHASE_MESSAGES,
  itemCountLabel,
  leadTimeLabel,
  personalizationMessage,
  selectionMessage,
} from './messages';

describe('selectionMessage', () => {
  it('asks for the choice by name', () => {
    expect(selectionMessage('מידת טבעת', 'missing')).toBe('יש לבחור מידת טבעת');
  });

  it('says a withdrawn choice is gone and what to do', () => {
    expect(selectionMessage('מידת טבעת', 'invalid')).toContain('יש לבחור אחרת');
  });
});

describe('personalizationMessage', () => {
  const name = { labelHe: 'שם לחריטה', fieldType: 'TEXT', maxLength: 12 };
  const language = { labelHe: 'שפת החריטה', fieldType: 'LANGUAGE', maxLength: null };

  it('asks to fill in text and to choose a choice', () => {
    expect(personalizationMessage(name, 'missing', '')).toBe('יש למלא שם לחריטה');
    expect(personalizationMessage(language, 'missing', '')).toBe('יש לבחור שפת החריטה');
  });

  it('states the limit and the count when text is too long', () => {
    expect(personalizationMessage(name, 'invalid', 'שם ארוך מדי לחריטה')).toBe(
      'עד 12 תווים. כרגע 18.',
    );
  });

  it('does not guess at which configured rule a value broke', () => {
    expect(personalizationMessage(name, 'invalid', 'מיכל!')).toBe(
      'מה שנכתב כאן אינו בפורמט המתאים. כדאי לבדוק ולנסות שוב.',
    );
  });
});

describe('labels', () => {
  it('counts one item the way Hebrew does', () => {
    expect(itemCountLabel(1)).toBe('פריט אחד');
    expect(itemCountLabel(3)).toBe('3 פריטים');
  });

  it('words the lead time as the product page does', () => {
    expect(leadTimeLabel(10)).toBe('זמן הכנה משוער: 10 ימי עסקים');
    expect(leadTimeLabel(1)).toBe('זמן הכנה משוער: יום עסקים אחד');
  });

  it('has a sentence for every refusal the cart can return', () => {
    for (const error of ['needs-choices', 'unavailable', 'invalid', 'not-found'] as const) {
      expect(PURCHASE_MESSAGES[error]).toMatch(/[֐-׿]/);
    }
  });
});
