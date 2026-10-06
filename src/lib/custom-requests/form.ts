/**
 * The custom-request form, as data: its fields, the rules, the Hebrew it says.
 *
 * Pure, so it is tested without a DOM and shared by both sides: the browser
 * checks these rules before sending, and the server checks them again
 * (src/lib/custom-requests/submit.ts) - its answer is the one that counts.
 *
 * ONE WAY BACK IS ENOUGH. The form asks for a phone or an email, not both: the
 * workshop needs to reach the visitor once, and the database holds that rule as
 * a CHECK constraint (`CustomRequest_contact_present`).
 */

export const JEWELRY_TYPES = [
  { value: 'RING', label: 'טבעת' },
  { value: 'EARRINGS', label: 'עגילים' },
  { value: 'NECKLACE', label: 'שרשרת או תליון' },
  { value: 'BRACELET', label: 'צמיד' },
  { value: 'SET', label: 'סט' },
  { value: 'OTHER', label: 'משהו אחר' },
] as const;

export type JewelryType = (typeof JEWELRY_TYPES)[number]['value'];

/**
 * What can be asked of a model. `size` is a ring's size or a chain's length -
 * the form names it for the piece (see `changeAreaLabel`).
 */
export const CHANGE_AREAS = [
  'gold_color',
  'gold_karat',
  'size',
  'stone',
  'engraving',
  'other',
] as const;

export type ChangeArea = (typeof CHANGE_AREAS)[number];

const CHANGE_LABELS: Readonly<Record<ChangeArea, string>> = {
  gold_color: 'גוון זהב',
  gold_karat: 'קראט זהב',
  size: 'מידה',
  stone: 'אבן',
  engraving: 'חריטה',
  other: 'משהו אחר',
};

/** The size of a ring, the length of anything worn on a chain. */
export function changeAreaLabel(area: ChangeArea, productType: string | null): string {
  if (area === 'size' && productType && productType !== 'RING') return 'אורך';
  return CHANGE_LABELS[area];
}

export const DESCRIPTION_MIN = 10;
export const DESCRIPTION_MAX = 2000;
export const NAME_MAX = 120;
export const EMAIL_MAX = 254;
export const PHONE_MAX = 20;

export interface RequestValues {
  jewelryType: JewelryType | '';
  changeAreas: ChangeArea[];
  description: string;
  fullName: string;
  phone: string;
  email: string;
}

export const EMPTY_REQUEST: RequestValues = {
  jewelryType: '',
  changeAreas: [],
  description: '',
  fullName: '',
  phone: '',
  email: '',
};

export type RequestField = 'jewelryType' | 'description' | 'fullName' | 'phone' | 'email';

/**
 * `contact`: neither a phone nor an email. It is shown on the phone field,
 * the first of the two, which is where the visitor is put to fix it.
 */
export type RequestProblem = 'missing' | 'invalid' | 'short' | 'contact';

export type RequestProblems = Partial<Record<RequestField, RequestProblem>>;

/** In page order - the first one takes focus. */
export const FIELD_ORDER: readonly RequestField[] = [
  'jewelryType',
  'description',
  'fullName',
  'phone',
  'email',
];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^[+()\d\s-]+$/;

export function isPhone(value: string): boolean {
  return PHONE.test(value) && value.replace(/\D/g, '').length >= 9;
}

export function isEmail(value: string): boolean {
  return EMAIL.test(value);
}

/**
 * Check a request. `fromModel` - sent from a product page - takes the kind of
 * jewellery from the model, so the form does not ask for it.
 */
export function validateRequest(values: RequestValues, fromModel: boolean): RequestProblems {
  const problems: RequestProblems = {};
  const description = values.description.trim();
  const fullName = values.fullName.trim();
  const phone = values.phone.trim();
  const email = values.email.trim();

  if (!fromModel && !values.jewelryType) problems.jewelryType = 'missing';

  if (description === '') problems.description = 'missing';
  else if (description.length < DESCRIPTION_MIN) problems.description = 'short';
  else if (description.length > DESCRIPTION_MAX) problems.description = 'invalid';

  if (fullName === '') problems.fullName = 'missing';
  else if (fullName.length > NAME_MAX) problems.fullName = 'invalid';

  if (phone === '' && email === '') problems.phone = 'contact';
  if (phone !== '' && (phone.length > PHONE_MAX || !isPhone(phone))) problems.phone = 'invalid';
  if (email !== '' && (email.length > EMAIL_MAX || !isEmail(email))) problems.email = 'invalid';

  return problems;
}

/** What a field says when it needs correcting: the problem, and the way out. */
export function requestMessage(field: RequestField, problem: RequestProblem): string {
  if (problem === 'contact') return 'יש להשאיר טלפון או אימייל, כדי שנוכל לחזור אליך.';

  switch (field) {
    case 'jewelryType':
      return 'יש לבחור סוג תכשיט.';
    case 'description':
      if (problem === 'missing') return 'יש לתאר את הבקשה במילים.';
      if (problem === 'short') return 'עוד כמה מילים יעזרו לנו להבין: לפחות 10 תווים.';
      return `אפשר לכתוב כאן עד ${DESCRIPTION_MAX} תווים.`;
    case 'fullName':
      return problem === 'missing' ? 'יש להזין שם.' : `אפשר לכתוב כאן עד ${NAME_MAX} תווים.`;
    case 'phone':
      return 'מספר טלפון צריך לכלול לפחות 9 ספרות. אפשר עם מקפים או רווחים.';
    case 'email':
      return 'כתובת האימייל לא נראית תקינה. לדוגמה: name@example.com';
  }
}

/** What is sent: the visitor's words and the model's address, never a price. */
export function toRequestPayload(
  values: RequestValues,
  model: { slug: string; choices: Readonly<Record<string, string>> } | null,
) {
  const optional = (value: string) => value.trim() || null;

  return {
    jewelryType: model ? null : values.jewelryType || null,
    productSlug: model?.slug ?? null,
    choices: model?.choices ?? {},
    changeAreas: model ? values.changeAreas : [],
    description: values.description.trim(),
    fullName: values.fullName.trim(),
    phone: optional(values.phone),
    email: optional(values.email),
  };
}
