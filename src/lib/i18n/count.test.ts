import { describe, expect, it } from 'vitest';

import { ACTIVE_FILTERS, CATEGORIES, ITEMS, PRODUCTS, countOf } from './count';

describe('countOf', () => {
  it('names the one instead of numbering it', () => {
    expect(countOf(1, PRODUCTS)).toBe('מוצר אחד');
    expect(countOf(1, ACTIVE_FILTERS)).toBe('מסנן פעיל אחד');
    expect(countOf(1, CATEGORIES)).toBe('קטגוריה אחת');
    expect(countOf(1, ITEMS)).toBe('פריט אחד');
  });

  it('numbers everything else in the plural, zero and two included', () => {
    expect(countOf(0, PRODUCTS)).toBe('0 מוצרים');
    expect(countOf(2, PRODUCTS)).toBe('2 מוצרים');
    expect(countOf(16, ACTIVE_FILTERS)).toBe('16 מסננים פעילים');
  });
});
