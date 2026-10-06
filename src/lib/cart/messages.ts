import { ITEMS, countOf } from '@/lib/i18n/count';
import { textFieldIssue, textIssueMessage } from '@/lib/personalization/engraving';

import type { FieldProblem } from './types';

/**
 * What the shopper is told when a piece cannot go in the bag yet.
 *
 * The server reports a field and a reason (missing or invalid), never a
 * sentence: its validator speaks English, for logs. The Hebrew is written
 * here, once, and each message names the problem and what to do about it.
 */

type Reason = FieldProblem['reason'];

/** A ring size, a chain length: a choice made from buttons. */
export function selectionMessage(optionName: string, reason: Reason): string {
  return reason === 'missing'
    ? `יש לבחור ${optionName}`
    : 'האפשרות שנבחרה כבר אינה זמינה. יש לבחור אחרת.';
}

/** A personalisation field: typed text, or a choice like the engraving language. */
export function personalizationMessage(
  field: { labelHe: string; fieldType: string; maxLength: number | null },
  reason: Reason,
  value: string,
  /** The engraving language chosen on the same product, if it asks for one. */
  language: string | null = null,
): string {
  const isChoice = field.fieldType === 'LANGUAGE' || field.fieldType === 'SELECT';

  if (reason === 'missing') {
    return isChoice ? `יש לבחור ${field.labelHe}` : `יש למלא ${field.labelHe}`;
  }

  if (isChoice) return 'האפשרות שנבחרה כבר אינה זמינה. יש לבחור אחרת.';

  // Length in the characters a person sees, emoji, and letters in the other
  // language - each named with the way out (src/lib/personalization/engraving.ts).
  const issue = textFieldIssue(value, { ...field, language });
  if (issue) return textIssueMessage(issue, value, field.maxLength);

  // A pattern the owner configured. Which rule failed is not known here, so
  // the message does not guess at one.
  return 'מה שנכתב כאן אינו בפורמט המתאים. כדאי לבדוק ולנסות שוב.';
}

/** "פריט אחד", "3 פריטים" - Hebrew names the one (src/lib/i18n/count.ts). */
export function itemCountLabel(count: number): string {
  return countOf(count, ITEMS);
}

/** The lead time, as the product page words it. */
export function leadTimeLabel(days: number): string {
  return days === 1 ? 'זמן הכנה משוער: יום עסקים אחד' : `זמן הכנה משוער: ${days} ימי עסקים`;
}

/** The line under the button, after a request comes back refused. */
export const PURCHASE_MESSAGES = {
  'needs-choices': 'חסרות בחירות. הן מסומנות למעלה.',
  unavailable: 'השילוב הזה אינו זמין להזמנה כרגע.',
  invalid: 'הדף התעדכן מאז שנפתח. כדאי לרענן ולבחור שוב.',
  'not-found': 'הדף התעדכן מאז שנפתח. כדאי לרענן ולבחור שוב.',
  failed: 'ההוספה לסל לא הצליחה. אפשר לנסות שוב.',
} as const;
