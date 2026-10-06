/**
 * Counted nouns, in Hebrew.
 *
 * Hebrew names the one rather than numbering it - "מוצר אחד", never
 * "1 מוצרים" - and every other count, zero included, takes the plural. (The
 * dual, "יומיים", belongs to a handful of time and measure words, none of
 * which the storefront counts.)
 *
 * Every "N + noun" on the site goes through `countOf`, so the rule lives in
 * one place instead of being remembered at each call site - which is how
 * "1 מוצרים" and "1 מסננים פעילים" shipped.
 */

export interface CountForms {
  /** The whole phrase for one: "מוצר אחד". */
  readonly one: string;
  /** The noun after any other number: "מוצרים". */
  readonly other: string;
}

export function countOf(count: number, forms: CountForms): string {
  return count === 1 ? forms.one : `${count} ${forms.other}`;
}

export const PRODUCTS: CountForms = { one: 'מוצר אחד', other: 'מוצרים' };
export const ITEMS: CountForms = { one: 'פריט אחד', other: 'פריטים' };
export const CATEGORIES: CountForms = { one: 'קטגוריה אחת', other: 'קטגוריות' };
export const ACTIVE_FILTERS: CountForms = { one: 'מסנן פעיל אחד', other: 'מסננים פעילים' };
