'use server';

import { revalidatePath } from 'next/cache';
import { after } from 'next/server';

import { notifyOrderPaid, notifyOrderShipped } from '@/lib/email/notify';
import { fromShekels, toAgorot } from '@/lib/money';

import { isManualPaymentMethod } from './order-steps';
import {
  cancelOrder,
  fixOrderStatus,
  markOrderPaid,
  markOrderRefunded,
  moveOrderStep,
  type WorkflowResult,
} from './order-workflow';
import { isOrderStatus, saveOrderNotes } from './orders';
import { isRequestStatus, updateRequest } from './requests';
import { requireAdminAction } from './session';

/**
 * Admin mutations for orders and requests. Every one re-checks the session
 * itself (ARCHITECTURE 6) - the page that rendered the form proves nothing
 * about the request that submits it.
 */

export interface ActionState {
  readonly ok: boolean;
  readonly message: string | null;
}

const NOTE_MAX = 2000;

function text(form: FormData, name: string, max = NOTE_MAX): string | null {
  const value = String(form.get(name) ?? '')
    .trim()
    .slice(0, max);
  return value || null;
}

/** The words for a refused move: the page was older than the order. */
function refused(result: WorkflowResult): ActionState | null {
  if (result === 'missing') return { ok: false, message: 'ההזמנה לא נמצאה.' };
  if (result === 'stale')
    return { ok: false, message: 'ההזמנה כבר עודכנה בינתיים. רעננו את הדף ונסו שוב.' };
  return null;
}

function done(message: string): ActionState {
  revalidatePath('/admin/orders', 'layout');
  return { ok: true, message };
}

/** "התקבל תשלום". */
export async function markOrderPaidAction(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  const user = await requireAdminAction();
  const orderId = String(form.get('orderId') ?? '');
  const method = form.get('method');
  if (!orderId) return { ok: false, message: 'ההזמנה לא נמצאה.' };
  if (!isManualPaymentMethod(method)) return { ok: false, message: 'בחרו איך שולם.' };

  const result = await markOrderPaid({
    orderId,
    method,
    note: text(form, 'note'),
    actorUserId: user.id,
  });
  const problem = refused(result);
  if (problem) return problem;

  after(() => notifyOrderPaid(orderId));
  return done('התשלום נרשם. ההזמנה מוכנה להכנה.');
}

/** The big next-step button, and the small "back one step". */
export async function moveOrderStepAction(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  const user = await requireAdminAction();
  const orderId = String(form.get('orderId') ?? '');
  const toStatus = form.get('toStatus');
  if (!orderId || !isOrderStatus(toStatus)) return { ok: false, message: 'ההזמנה לא נמצאה.' };

  const result = await moveOrderStep({
    orderId,
    toStatus,
    trackingNumber: text(form, 'trackingNumber', 60),
    note: text(form, 'note'),
    actorUserId: user.id,
  });
  const problem = refused(result);
  if (problem) return problem;

  if (toStatus === 'SHIPPED') after(() => notifyOrderShipped(orderId));
  return done('נשמר.');
}

export async function cancelOrderAction(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  const user = await requireAdminAction();
  const orderId = String(form.get('orderId') ?? '');
  if (!orderId) return { ok: false, message: 'ההזמנה לא נמצאה.' };

  const reason = text(form, 'reason');
  const result = await cancelOrder({
    orderId,
    reason: reason ? `סיבת הביטול: ${reason}` : null,
    actorUserId: user.id,
  });
  const problem = refused(result);
  if (problem) return problem;
  return done('ההזמנה בוטלה.');
}

export async function markOrderRefundedAction(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  const user = await requireAdminAction();
  const orderId = String(form.get('orderId') ?? '');
  if (!orderId) return { ok: false, message: 'ההזמנה לא נמצאה.' };

  const result = await markOrderRefunded({
    orderId,
    note: text(form, 'note'),
    actorUserId: user.id,
  });
  const problem = refused(result);
  if (problem) return problem;
  return done('נרשם שהכסף הוחזר.');
}

/** The manual fix, tucked away under "תיקון ידני". */
export async function changeOrderStatusAction(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  const user = await requireAdminAction();
  const orderId = String(form.get('orderId') ?? '');
  const toStatus = form.get('status');
  if (!orderId || !isOrderStatus(toStatus)) return { ok: false, message: 'בחרו סטטוס.' };

  const result = await fixOrderStatus({
    orderId,
    toStatus,
    note: text(form, 'note'),
    actorUserId: user.id,
  });
  if (result === 'missing') return { ok: false, message: 'ההזמנה לא נמצאה.' };
  if (result === 'forbidden')
    return {
      ok: false,
      message: 'תשלום והחזר כספי נרשמים בכפתורים "התקבל תשלום" ו"הכסף הוחזר", לא כאן.',
    };

  revalidatePath('/admin/orders', 'layout');
  return { ok: true, message: result === 'changed' ? 'נשמר.' : 'לא היה שינוי.' };
}

export async function saveOrderNotesAction(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireAdminAction();
  const orderId = String(form.get('orderId') ?? '');
  if (!orderId) return { ok: false, message: 'ההזמנה לא נמצאה.' };

  await saveOrderNotes(orderId, text(form, 'notes', 5000) ?? '');
  revalidatePath('/admin/orders', 'layout');
  return { ok: true, message: 'ההערות נשמרו.' };
}

export async function updateRequestAction(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  const user = await requireAdminAction();
  const requestId = String(form.get('requestId') ?? '');
  const toStatus = form.get('status');
  if (!requestId || !isRequestStatus(toStatus)) return { ok: false, message: 'בחרו סטטוס.' };

  let quoteAgorot: number | null = null;
  const quote = text(form, 'quote', 20);
  if (quote) {
    try {
      quoteAgorot = toAgorot(fromShekels(quote.replace(/[,₪\s]/g, '')));
    } catch {
      return { ok: false, message: 'סכום ההצעה צריך להיות מספר בשקלים, למשל 4800.' };
    }
    if (quoteAgorot <= 0) return { ok: false, message: 'סכום ההצעה צריך להיות גדול מאפס.' };
  }
  if (toStatus === 'QUOTE_SENT' && quoteAgorot === null) {
    return { ok: false, message: 'כדי לסמן שנשלחה הצעת מחיר, רשמו את הסכום.' };
  }

  const result = await updateRequest({
    requestId,
    toStatus,
    note: text(form, 'note'),
    quoteAgorot,
    quoteNotes: text(form, 'quoteNotes', 5000),
    internalNotes: text(form, 'internalNotes', 5000),
    actorUserId: user.id,
  });
  if (result === 'missing') return { ok: false, message: 'הבקשה לא נמצאה.' };

  revalidatePath('/admin/requests', 'layout');
  return { ok: true, message: 'נשמר.' };
}
