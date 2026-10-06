/**
 * How a custom piece comes to be, in three steps - shown on /custom and beside
 * the request form.
 *
 * Process description, not marketing claims: no turnaround time or price is
 * stated, because neither has been decided.
 */
export const CUSTOM_STEPS: readonly { id: string; title: string; body: string }[] = [
  { id: 'brief', title: 'פנייה', body: 'תיאור הרעיון, דגם להשראה או תכשיט קיים לשינוי.' },
  { id: 'design', title: 'שרטוט ואישור', body: 'הצעת עיצוב והצעת מחיר לאישור לפני תחילת העבודה.' },
  { id: 'craft', title: 'ייצור', body: 'הכנת התכשיט לאחר אישור, כולל חריטה והתאמות מידה.' },
];
