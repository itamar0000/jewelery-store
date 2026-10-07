'use server';

import { revalidatePath } from 'next/cache';

import { fromShekels, toAgorot } from '@/lib/money';

import { changeOrderStatus, isOrderStatus, saveOrderNotes } from './orders';
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

export async function changeOrderStatusAction(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  const user = await requireAdminAction();
  const orderId = String(form.get('orderId') ?? '');
  const toStatus = form.get('status');
  if (!orderId || !isOrderStatus(toStatus)) return { ok: false, message: 'בחרו סטטוס.' };

  const result = await changeOrderStatus({
    orderId,
    toStatus,
    note: text(form, 'note'),
    actorUserId: user.id,
  });
  if (result === 'missing') return { ok: false, message: 'ההזמנה לא נמצאה.' };

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
