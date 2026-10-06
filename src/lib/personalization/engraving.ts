/**
 * What can be engraved, checked the same way in the browser and on the server.
 *
 * THREE THINGS THE OLD CHECK MISSED (critique 2026-10-06, P2):
 *
 *   1. LENGTH WAS COUNTED IN UTF-16 UNITS, so a name with niqqud or an accented
 *      letter ran out of room early, and the browser's `maxLength` cut a
 *      character in half. Length is now counted in graphemes - the characters
 *      a person sees - with `Intl.Segmenter`.
 *   2. EMOJI WERE ACCEPTED, though nobody can cut a heart emoji into gold.
 *   3. THE LANGUAGE WAS NOT CHECKED AGAINST THE LETTERS. "עברית" was chosen and
 *      "Noa" typed, and the order would have gone to the workshop that way.
 *
 * Only a one-line TEXT field is an engraving; a TEXTAREA ("הערות") is a note
 * to the workshop and is checked for length alone. Digits, spaces and common
 * punctuation are allowed in either language - a date is engraved as often as
 * a name.
 */

export type TextIssue = 'emoji' | 'script-he' | 'script-en' | 'length';

const segmenter =
  typeof Intl !== 'undefined' && 'Segmenter' in Intl
    ? new Intl.Segmenter('he', { granularity: 'grapheme' })
    : null;

/** Characters as a person counts them: "נֹעָה" is 3, "é" is 1, a flag is 1. */
export function graphemeCount(value: string): number {
  if (!segmenter) return [...value].length;
  let count = 0;
  for (const _ of segmenter.segment(value)) count += 1;
  return count;
}

const EMOJI = /\p{Extended_Pictographic}|\p{Regional_Indicator}/u;
// Letters of the other script; marks, digits, spaces and punctuation are neutral.
const LATIN_LETTER = /\p{Script=Latin}/u;
const HEBREW_LETTER = /\p{Script=Hebrew}/u;

export function textFieldIssue(
  value: string,
  rule: {
    readonly fieldType: string;
    readonly maxLength: number | null;
    /** The chosen engraving language - "he", "en" - when the product asks for one. */
    readonly language?: string | null;
  },
): TextIssue | null {
  const text = value.trim();
  if (text === '') return null;

  if (rule.maxLength !== null && graphemeCount(text) > rule.maxLength) return 'length';
  if (rule.fieldType !== 'TEXT') return null;

  if (EMOJI.test(text)) return 'emoji';
  if (rule.language === 'he' && LATIN_LETTER.test(text)) return 'script-he';
  if (rule.language === 'en' && HEBREW_LETTER.test(text)) return 'script-en';
  return null;
}

/** What to say about an issue, naming the way out. */
export function textIssueMessage(
  issue: TextIssue,
  value: string,
  maxLength: number | null,
): string {
  switch (issue) {
    case 'length':
      return `עד ${maxLength} תווים. כרגע ${graphemeCount(value.trim())}.`;
    case 'emoji':
      return 'אי אפשר לחרוט אמוג׳י או סמלים. אפשר אותיות, ספרות וסימני פיסוק.';
    case 'script-he':
      return 'נבחרה חריטה בעברית, ונכתבו כאן אותיות לועזיות. אפשר לכתוב בעברית או לבחור אנגלית.';
    case 'script-en':
      return 'נבחרה חריטה באנגלית, ונכתבו כאן אותיות עבריות. אפשר לכתוב באנגלית או לבחור עברית.';
  }
}
