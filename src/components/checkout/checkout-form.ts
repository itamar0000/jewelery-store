import type { FieldProblem } from '@/lib/cart/types';

/**
 * The checkout form, as data: its fields, the rules the browser checks, the
 * Hebrew it says, and the mapping from the server's answer back onto fields.
 *
 * Pure, so it is tested without a DOM. The rules mirror the server's schema
 * (`checkoutSchema`, src/lib/validation/commerce.ts) closely enough to catch
 * the common mistakes before a round trip; the server checks again, and its
 * answer is the one that counts.
 */

export interface CheckoutValues {
  customerName: string;
  email: string;
  phone: string;
  street: string;
  houseNumber: string;
  apartment: string;
  city: string;
  postalCode: string;
  instructions: string;
  /** Delivery to someone other than the buyer - a gift, most often. */
  forSomeoneElse: boolean;
  recipientName: string;
  recipientPhone: string;
}

export type FieldKey = Exclude<keyof CheckoutValues, 'forSomeoneElse'>;

export type ProblemMap = Partial<Record<FieldKey, FieldProblem['reason']>>;

export const EMPTY_VALUES: CheckoutValues = {
  customerName: '',
  email: '',
  phone: '',
  street: '',
  houseNumber: '',
  apartment: '',
  city: '',
  postalCode: '',
  instructions: '',
  forSomeoneElse: false,
  recipientName: '',
  recipientPhone: '',
};

export interface FieldSpec {
  readonly label: string;
  readonly required: boolean;
  readonly max: number;
  readonly type?: 'text' | 'email' | 'tel';
  readonly inputMode?: 'text' | 'email' | 'tel' | 'numeric';
  readonly autoComplete?: string;
  /** Typed left to right inside the right-to-left form: addresses, numbers. */
  readonly ltr?: boolean;
  readonly multiline?: boolean;
  /** What to say when a required field is left empty. */
  readonly missing: string;
}

/**
 * Every field, in the words the form uses.
 *
 * The recipient's fields are worded around the delivery rather than the
 * person ("שם לקבלת המשלוח"), which keeps them free of a grammatical gender
 * the form cannot know.
 */
export const FIELDS: Readonly<Record<FieldKey, FieldSpec>> = {
  customerName: {
    label: 'שם מלא',
    required: true,
    max: 120,
    autoComplete: 'name',
    missing: 'יש להזין שם מלא',
  },
  email: {
    label: 'אימייל',
    required: true,
    max: 254,
    type: 'email',
    inputMode: 'email',
    autoComplete: 'email',
    ltr: true,
    missing: 'יש להזין כתובת אימייל',
  },
  phone: {
    label: 'טלפון',
    required: true,
    max: 20,
    type: 'tel',
    inputMode: 'tel',
    autoComplete: 'tel',
    ltr: true,
    missing: 'יש להזין מספר טלפון',
  },
  street: {
    label: 'רחוב',
    required: true,
    max: 120,
    autoComplete: 'shipping address-line1',
    missing: 'יש להזין רחוב',
  },
  houseNumber: {
    label: 'מספר בית',
    required: true,
    max: 20,
    missing: 'יש להזין מספר בית',
  },
  apartment: {
    label: 'דירה',
    required: false,
    max: 20,
    autoComplete: 'shipping address-line2',
    missing: '',
  },
  city: {
    label: 'עיר או יישוב',
    required: true,
    max: 80,
    autoComplete: 'shipping address-level2',
    missing: 'יש להזין עיר או יישוב',
  },
  postalCode: {
    label: 'מיקוד',
    required: false,
    max: 9,
    inputMode: 'numeric',
    autoComplete: 'shipping postal-code',
    ltr: true,
    missing: '',
  },
  instructions: {
    label: 'הערות לשליח',
    required: false,
    max: 500,
    multiline: true,
    missing: '',
  },
  recipientName: {
    label: 'שם לקבלת המשלוח',
    required: true,
    max: 120,
    autoComplete: 'shipping name',
    missing: 'יש להזין שם לקבלת המשלוח',
  },
  recipientPhone: {
    label: 'טלפון לקבלת המשלוח',
    required: true,
    max: 20,
    type: 'tel',
    inputMode: 'tel',
    autoComplete: 'shipping tel',
    ltr: true,
    missing: 'יש להזין טלפון לקבלת המשלוח',
  },
};

/** The fields each step asks for, in the order they are drawn. */
export function stepFields(step: 1 | 2, values: CheckoutValues): FieldKey[] {
  if (step === 1) return ['customerName', 'email', 'phone'];

  return [
    'street',
    'houseNumber',
    'apartment',
    'city',
    'postalCode',
    ...(values.forSomeoneElse ? (['recipientName', 'recipientPhone'] as const) : []),
    'instructions',
  ];
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^[+()\d\s-]+$/;

/** Check the given fields; an empty map means they will pass. */
export function validate(values: CheckoutValues, keys: readonly FieldKey[]): ProblemMap {
  const problems: ProblemMap = {};

  for (const key of keys) {
    const spec = FIELDS[key];
    const value = values[key].trim();

    if (value === '') {
      if (spec.required) problems[key] = 'missing';
      continue;
    }

    if (value.length > spec.max) problems[key] = 'invalid';
    else if (key === 'email' && !EMAIL.test(value)) problems[key] = 'invalid';
    else if ((key === 'phone' || key === 'recipientPhone') && !isPhone(value)) {
      problems[key] = 'invalid';
    } else if (key === 'postalCode' && !/^\d{5,7}$/.test(value.replace(/\s/g, ''))) {
      problems[key] = 'invalid';
    }
  }

  return problems;
}

function isPhone(value: string): boolean {
  return PHONE.test(value) && value.replace(/\D/g, '').length >= 9;
}

/** What a field says when it needs correcting: the problem, and the way out. */
export function fieldMessage(key: FieldKey, reason: FieldProblem['reason']): string {
  if (reason === 'missing') return FIELDS[key].missing;

  switch (key) {
    case 'email':
      return 'כתובת האימייל לא נראית תקינה. לדוגמה: name@example.com';
    case 'phone':
    case 'recipientPhone':
      return 'מספר הטלפון צריך לכלול ספרות בלבד, לפחות 9.';
    case 'postalCode':
      return 'מיקוד הוא 5 עד 7 ספרות.';
    default:
      return `אפשר לכתוב כאן עד ${FIELDS[key].max} תווים.`;
  }
}

/**
 * The server's field path, as the form names it.
 *
 * The order records the delivery's own name and phone. When the buyer is
 * also the recipient those are the buyer's, so a problem with them belongs on
 * the buyer's fields - the ones the shopper actually typed.
 */
export function fieldFromPath(path: string, values: CheckoutValues): FieldKey | null {
  switch (path) {
    case 'customerName':
    case 'email':
    case 'phone':
      return path;
    case 'shippingAddress.fullName':
      return values.forSomeoneElse ? 'recipientName' : 'customerName';
    case 'shippingAddress.phone':
      return values.forSomeoneElse ? 'recipientPhone' : 'phone';
    case 'shippingAddress.street':
      return 'street';
    case 'shippingAddress.houseNumber':
      return 'houseNumber';
    case 'shippingAddress.apartment':
      return 'apartment';
    case 'shippingAddress.city':
      return 'city';
    case 'shippingAddress.postalCode':
      return 'postalCode';
    case 'shippingAddress.instructions':
      return 'instructions';
    default:
      return null;
  }
}

/** The step a field lives on. */
export function stepOf(key: FieldKey): 1 | 2 {
  return key === 'customerName' || key === 'email' || key === 'phone' ? 1 : 2;
}

/**
 * What is sent to the server: contact and delivery, never a price.
 *
 * Trimmed, with a blank optional sent as no value at all - the shape the
 * server's schema takes as it stands. The server normalises the same way
 * before validating, so a request built any other way is read alike.
 */
export function toPayload(values: CheckoutValues) {
  const text = (value: string) => value.trim();
  const optional = (value: string) => value.trim() || null;

  return {
    customerName: text(values.customerName),
    email: text(values.email),
    phone: text(values.phone),
    marketingOptIn: false,
    shippingAddress: {
      fullName: text(values.forSomeoneElse ? values.recipientName : values.customerName),
      phone: text(values.forSomeoneElse ? values.recipientPhone : values.phone),
      street: text(values.street),
      houseNumber: text(values.houseNumber),
      apartment: optional(values.apartment),
      city: text(values.city),
      postalCode: optional(values.postalCode.replace(/\s/g, '')),
      instructions: optional(values.instructions),
    },
  };
}

/** One line of address, for the review: "הרצל 12, דירה 4, תל אביב 6100001". */
export function addressLine(values: CheckoutValues): string {
  const street = `${values.street.trim()} ${values.houseNumber.trim()}`.trim();
  const apartment = values.apartment.trim() ? `דירה ${values.apartment.trim()}` : '';
  const city = [values.city.trim(), values.postalCode.replace(/\s/g, '')].filter(Boolean).join(' ');
  return [street, apartment, city].filter(Boolean).join(', ');
}

/** Restore saved values, keeping only fields this form knows, as strings. */
export function readSaved(raw: string | null): CheckoutValues | null {
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const source = parsed as Record<string, unknown>;

    const values: CheckoutValues = { ...EMPTY_VALUES };
    for (const key of Object.keys(FIELDS) as FieldKey[]) {
      const value = source[key];
      if (typeof value === 'string') values[key] = value;
    }
    values.forSomeoneElse = source.forSomeoneElse === true;
    return values;
  } catch {
    return null;
  }
}
