import { describe, expect, it } from 'vitest';

import { SORT_OPTIONS, filtersForCategory } from './filter-config';

/**
 * MASTER_SPECIFICATION section 10 requires filters to be CATEGORY-AWARE and
 * states that irrelevant filters must not be displayed. The implementation plan
 * lists "only category-relevant filters render" as an acceptance criterion, so
 * it is asserted rather than left to review.
 */
describe('filtersForCategory', () => {
  it('offers ring size on rings', () => {
    expect(filtersForCategory('rings').map((f) => f.id)).toContain('ringSize');
  });

  it('does NOT offer ring size on necklaces, bracelets, earrings or sets', () => {
    for (const category of ['necklaces', 'bracelets', 'earrings', 'sets']) {
      expect(filtersForCategory(category).map((f) => f.id)).not.toContain('ringSize');
    }
  });

  it('offers length on necklaces and bracelets only', () => {
    expect(filtersForCategory('necklaces').map((f) => f.id)).toContain('length');
    expect(filtersForCategory('bracelets').map((f) => f.id)).toContain('length');
    expect(filtersForCategory('rings').map((f) => f.id)).not.toContain('length');
    expect(filtersForCategory('earrings').map((f) => f.id)).not.toContain('length');
  });

  it('offers diamond shape on rings and earrings, not on necklaces or bracelets', () => {
    expect(filtersForCategory('rings').map((f) => f.id)).toContain('diamondShape');
    expect(filtersForCategory('earrings').map((f) => f.id)).toContain('diamondShape');
    expect(filtersForCategory('necklaces').map((f) => f.id)).not.toContain('diamondShape');
  });

  it('always offers the shared filters', () => {
    for (const category of ['rings', 'earrings', 'necklaces', 'bracelets', 'sets']) {
      const ids = filtersForCategory(category).map((f) => f.id);

      expect(ids).toContain('price');
      expect(ids).toContain('karat');
      expect(ids).toContain('goldColor');
    }
  });

  it('falls back to shared filters for an unknown category rather than throwing', () => {
    const ids = filtersForCategory('does-not-exist').map((f) => f.id);

    expect(ids).toContain('price');
    expect(ids).not.toContain('ringSize');
  });

  it('resolves every configured id to a real definition', () => {
    for (const category of ['rings', 'earrings', 'necklaces', 'bracelets', 'sets']) {
      for (const filter of filtersForCategory(category)) {
        expect(filter).toBeDefined();
        expect(filter.label.length).toBeGreaterThan(0);
      }
    }
  });

  it('gives every non-range filter at least one option', () => {
    for (const filter of filtersForCategory('rings')) {
      if (filter.kind !== 'range') {
        expect(filter.options?.length ?? 0).toBeGreaterThan(0);
      }
    }
  });
});

describe('SORT_OPTIONS', () => {
  it('uses unique ids', () => {
    const ids = SORT_OPTIONS.map((option) => option.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
