import type { OrderStatus, PaymentStatus } from '@/generated/prisma/client';

/**
 * The order's path through the workshop, as buttons rather than a list.
 *
 * The owner sees ONE thing to do next ("התחלתי להכין", "התכשיט מוכן", ...),
 * a quiet way back one step if a button was pressed by mistake, and cancel
 * on its own. Payment is never a status picked from a list: "התקבל תשלום"
 * records a payment (order-workflow.ts), so the order and its payment status
 * can no longer disagree.
 *
 * Pure: the page reads it, and the server action re-checks it, so a stale
 * page cannot move an order along a path that is not there.
 */

/** The stages shown as a progress line, in order. */
export const STAGES: readonly { readonly status: OrderStatus; readonly label: string }[] = [
  { status: 'PENDING_PAYMENT', label: 'ממתינה לתשלום' },
  { status: 'PAID', label: 'שולמה' },
  { status: 'PROCESSING', label: 'בהכנה' },
  { status: 'READY', label: 'מוכנה' },
  { status: 'SHIPPED', label: 'נשלחה' },
  { status: 'DELIVERED', label: 'נמסרה' },
];

export interface StepAction {
  readonly toStatus: OrderStatus;
  /** The button. */
  readonly label: string;
  /** One line under it, saying what the press means. */
  readonly hint: string;
}

const FORWARD: Partial<Record<OrderStatus, StepAction>> = {
  PAID: {
    toStatus: 'PROCESSING',
    label: 'התחלתי להכין',
    hint: 'לוחצים כשהתכשיט נכנס לעבודה.',
  },
  PROCESSING: {
    toStatus: 'READY',
    label: 'התכשיט מוכן',
    hint: 'לוחצים כשהתכשיט ארוז ומוכן למשלוח.',
  },
  READY: {
    toStatus: 'SHIPPED',
    label: 'נשלח ללקוח',
    hint: 'לוחצים כשהחבילה נמסרה לשליח. אפשר לרשום מספר מעקב.',
  },
  SHIPPED: {
    toStatus: 'DELIVERED',
    label: 'הלקוח קיבל',
    hint: 'לוחצים כשהחבילה הגיעה. ההזמנה יוצאת מרשימת "לטיפול".',
  },
};

const BACK: Partial<Record<OrderStatus, OrderStatus>> = {
  PROCESSING: 'PAID',
  READY: 'PROCESSING',
  SHIPPED: 'READY',
  DELIVERED: 'SHIPPED',
};

/** What the big button does now, or null when the next move is not a step. */
export function nextStep(status: OrderStatus): StepAction | null {
  return FORWARD[status] ?? null;
}

/** The status one step back, for undoing a press made by mistake. */
export function previousStatus(status: OrderStatus): OrderStatus | null {
  return BACK[status] ?? null;
}

/** "התקבל תשלום" is offered while no payment has been recorded. */
export function canMarkPaid(status: OrderStatus, paymentStatus: PaymentStatus): boolean {
  return (status === 'PENDING_PAYMENT' || status === 'CANCELLED') && paymentStatus !== 'PAID';
}

/** Cancelling is for orders that have not left the workshop. */
export function canCancel(status: OrderStatus): boolean {
  return (
    status === 'PENDING_PAYMENT' ||
    status === 'PAID' ||
    status === 'PROCESSING' ||
    status === 'READY'
  );
}

/** A paid order that was cancelled waits for its money to go back. */
export function canMarkRefunded(status: OrderStatus, paymentStatus: PaymentStatus): boolean {
  return status === 'CANCELLED' && paymentStatus === 'PAID';
}

/** Whether `to` is a move the step buttons offer from `from`. */
export function isStepMove(from: OrderStatus, to: OrderStatus): boolean {
  return FORWARD[from]?.toStatus === to || BACK[from] === to;
}

/** Index on the progress line; cancelled and refunded orders are off it. */
export function stageIndex(status: OrderStatus): number {
  if (status === 'COMPLETED') return STAGES.length - 1;
  return STAGES.findIndex((stage) => stage.status === status);
}

/** A short "what now" line for lists and cards. */
export function nextStepHint(status: OrderStatus, paymentStatus: PaymentStatus): string | null {
  if (status === 'PENDING_PAYMENT') return 'מחכה לתשלום';
  if (canMarkRefunded(status, paymentStatus)) return 'להחזיר כסף ללקוח';
  const step = nextStep(status);
  return step ? `הצעד הבא: ${step.label}` : null;
}

/** How payment was taken when it was not through the site. */
export const MANUAL_PAYMENT_METHODS = [
  { value: 'link', label: 'קישור תשלום' },
  { value: 'bit', label: 'ביט / פייבוקס' },
  { value: 'transfer', label: 'העברה בנקאית' },
  { value: 'cash', label: 'מזומן' },
  { value: 'card', label: 'כרטיס אשראי בטלפון' },
  { value: 'other', label: 'אחר' },
] as const;

export type ManualPaymentMethod = (typeof MANUAL_PAYMENT_METHODS)[number]['value'];

export function isManualPaymentMethod(value: unknown): value is ManualPaymentMethod {
  return MANUAL_PAYMENT_METHODS.some((method) => method.value === value);
}

export function manualPaymentLabel(value: ManualPaymentMethod): string {
  return MANUAL_PAYMENT_METHODS.find((method) => method.value === value)?.label ?? 'אחר';
}
