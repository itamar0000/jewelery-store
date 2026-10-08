/**
 * The "all of this category" chip's label.
 *
 * "כל ה" + the category's name reads well for a kind of jewellery ("כל
 * הטבעות") and wrongly for a department named for its wearer: "כל הגברים"
 * means "all the men". A department carries its own wording here (D4D.34).
 */
const ALL_LABELS: Readonly<Record<string, string>> = {
  men: 'כל התכשיטים לגבר',
};

export function allInCategoryLabel(slug: string, nameHe: string): string {
  return ALL_LABELS[slug] ?? `כל ה${nameHe}`;
}
