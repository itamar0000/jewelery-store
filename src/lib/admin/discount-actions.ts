'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { prisma } from '@/lib/db';
import { normalizeCouponCode } from '@/lib/coupons/evaluate';

import {
  parseAmount,
  parseIsraelDate,
  parsePercent,
  readTargets,
  targetRow,
  type TargetKind,
} from './discounts';
import type { ActionState } from './panel-actions';
import { requireAdminAction } from './session';

/**
 * Admin mutations for sales, coupons and announcements (D4D.33). Each one
 * re-checks the session, validates on the server, and refreshes the whole
 * storefront, since a sale or an announcement can change any page.
 */

function field(form: FormData, name: string, max = 300): string {
  return String(form.get(name) ?? '')
    .trim()
    .slice(0, max);
}

function readWindow(form: FormData): { startsAt: Date | null; endsAt: Date | null } | string {
  const startRaw = field(form, 'startsOn', 10);
  const endRaw = field(form, 'endsOn', 10);
  const startsAt = startRaw ? parseIsraelDate(startRaw) : null;
  const endsAt = endRaw ? parseIsraelDate(endRaw, true) : null;
  if (startRaw && !startsAt) return 'תאריך ההתחלה לא תקין.';
  if (endRaw && !endsAt) return 'תאריך הסיום לא תקין.';
  if (startsAt && endsAt && startsAt >= endsAt) return 'תאריך הסיום צריך להיות אחרי תאריך ההתחלה.';
  return { startsAt, endsAt };
}

function readDiscount(
  form: FormData,
): { discountType: 'PERCENTAGE' | 'FIXED_AMOUNT'; discountValue: number } | string {
  const kind = field(form, 'kind', 20);
  const raw = field(form, 'value', 20);
  if (kind === 'PERCENTAGE') {
    const value = parsePercent(raw);
    return value
      ? { discountType: 'PERCENTAGE', discountValue: value }
      : 'אחוז ההנחה צריך להיות בין 1 ל-100.';
  }
  if (kind === 'FIXED_AMOUNT') {
    const value = parseAmount(raw);
    return value
      ? { discountType: 'FIXED_AMOUNT', discountValue: value }
      : 'סכום ההנחה צריך להיות מספר בשקלים, למשל 200.';
  }
  return 'בחרו סוג הנחה.';
}

const TARGET_KIND: Readonly<Record<string, TargetKind | null>> = {
  ENTIRE_SITE: null,
  ENTIRE_ORDER: null,
  PRODUCT: 'PRODUCT',
  CATEGORY: 'CATEGORY',
  COLLECTION: 'COLLECTION',
};

function refreshAll() {
  revalidatePath('/', 'layout');
}

// ------------------------------------------------------------------- sales

export async function savePromotionAction(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireAdminAction();
  const id = field(form, 'id', 40) || null;
  const nameHe = field(form, 'nameHe', 80);
  if (nameHe.length < 2) return { ok: false, message: 'תנו למבצע שם, למשל "20% על עגילים".' };

  const discount = readDiscount(form);
  if (typeof discount === 'string') return { ok: false, message: discount };
  const window = readWindow(form);
  if (typeof window === 'string') return { ok: false, message: window };

  const scope = field(form, 'scope', 20);
  if (!['ENTIRE_SITE', 'PRODUCT', 'CATEGORY', 'COLLECTION'].includes(scope)) {
    return { ok: false, message: 'בחרו על מה המבצע חל.' };
  }
  const kind = TARGET_KIND[scope] ?? null;
  const targets = readTargets(form, kind);
  if (kind && targets.length === 0)
    return { ok: false, message: 'סמנו לפחות פריט אחד שהמבצע חל עליו.' };

  const data = {
    nameHe,
    ...discount,
    appliesTo: scope as 'ENTIRE_SITE' | 'PRODUCT' | 'CATEGORY' | 'COLLECTION',
    ...window,
    isActive: form.get('active') === 'on',
  };
  const targetRows = kind ? targets.map((targetId) => targetRow(kind, targetId)) : [];

  if (id) {
    await prisma.$transaction([
      prisma.promotionTarget.deleteMany({ where: { promotionId: id } }),
      prisma.promotion.update({
        where: { id },
        data: { ...data, targets: { create: targetRows } },
      }),
    ]);
  } else {
    await prisma.promotion.create({ data: { ...data, targets: { create: targetRows } } });
  }
  refreshAll();
  redirect('/admin/promotions?saved=1');
}

export async function archivePromotionAction(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireAdminAction();
  const id = field(form, 'id', 40);
  if (!id) return { ok: false, message: 'המבצע לא נמצא.' };
  await prisma.promotion.update({
    where: { id },
    data: { archivedAt: new Date(), isActive: false },
  });
  refreshAll();
  redirect('/admin/promotions');
}

// ----------------------------------------------------------------- coupons

export async function saveCouponAction(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireAdminAction();
  const id = field(form, 'id', 40) || null;
  const code = normalizeCouponCode(field(form, 'code', 40));
  if (!/^[A-Z0-9_-]{3,32}$/.test(code)) {
    return {
      ok: false,
      message: 'קוד הקופון: 3 עד 32 תווים, אותיות באנגלית, ספרות, מקף או קו תחתון.',
    };
  }
  const clash = await prisma.coupon.findUnique({
    where: { codeNormalized: code },
    select: { id: true },
  });
  if (clash && clash.id !== id) return { ok: false, message: `כבר יש קופון בקוד ${code}.` };

  const discount = readDiscount(form);
  if (typeof discount === 'string') return { ok: false, message: discount };
  const window = readWindow(form);
  if (typeof window === 'string') return { ok: false, message: window };

  const minRaw = field(form, 'minOrder', 20);
  const minOrderAgorot = minRaw ? parseAmount(minRaw) : null;
  if (minRaw && minOrderAgorot === null)
    return { ok: false, message: 'סכום ההזמנה המינימלי לא תקין.' };
  const capRaw = field(form, 'maxDiscount', 20);
  const maxDiscountAgorot =
    discount.discountType === 'PERCENTAGE' && capRaw ? parseAmount(capRaw) : null;
  if (discount.discountType === 'PERCENTAGE' && capRaw && maxDiscountAgorot === null) {
    return { ok: false, message: 'תקרת ההנחה לא תקינה.' };
  }
  const limit = (name: string) => {
    const raw = field(form, name, 6);
    if (!raw) return null;
    const value = Number(raw);
    return Number.isInteger(value) && value > 0 ? value : NaN;
  };
  const usageLimitTotal = limit('usageTotal');
  const usageLimitPerCustomer = limit('usagePerCustomer');
  if (Number.isNaN(usageLimitTotal) || Number.isNaN(usageLimitPerCustomer)) {
    return { ok: false, message: 'מגבלות השימוש צריכות להיות מספר שלם, או ריקות.' };
  }

  const scope = field(form, 'scope', 20);
  if (!['ENTIRE_ORDER', 'PRODUCT', 'CATEGORY', 'COLLECTION'].includes(scope)) {
    return { ok: false, message: 'בחרו על מה הקופון חל.' };
  }
  const kind = TARGET_KIND[scope] ?? null;
  const targets = readTargets(form, kind);
  if (kind && targets.length === 0)
    return { ok: false, message: 'סמנו לפחות פריט אחד שהקופון חל עליו.' };

  const data = {
    code,
    codeNormalized: code,
    descriptionHe: field(form, 'descriptionHe', 200) || null,
    ...discount,
    minOrderAgorot,
    maxDiscountAgorot,
    ...window,
    usageLimitTotal,
    usageLimitPerCustomer,
    appliesTo: scope as 'ENTIRE_ORDER' | 'PRODUCT' | 'CATEGORY' | 'COLLECTION',
    isActive: form.get('active') === 'on',
  };
  const targetRows = kind
    ? targets.map((targetId) => ({ targetType: kind, ...targetRow(kind, targetId) }))
    : [];

  if (id) {
    await prisma.$transaction([
      prisma.couponTarget.deleteMany({ where: { couponId: id } }),
      prisma.coupon.update({ where: { id }, data: { ...data, targets: { create: targetRows } } }),
    ]);
  } else {
    await prisma.coupon.create({ data: { ...data, targets: { create: targetRows } } });
  }
  refreshAll();
  redirect('/admin/coupons?saved=1');
}

export async function archiveCouponAction(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireAdminAction();
  const id = field(form, 'id', 40);
  if (!id) return { ok: false, message: 'הקופון לא נמצא.' };
  await prisma.coupon.update({ where: { id }, data: { archivedAt: new Date(), isActive: false } });
  refreshAll();
  redirect('/admin/coupons');
}

// ----------------------------------------------------------- announcements

export async function saveAnnouncementAction(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireAdminAction();
  const id = field(form, 'id', 40) || null;
  const textHe = field(form, 'textHe', 160);
  if (textHe.length < 3) return { ok: false, message: 'כתבו את ההודעה.' };
  const linkHref = field(form, 'linkHref', 300) || null;
  if (linkHref && !/^(\/[^\s]*|https:\/\/[^\s]+)$/.test(linkHref)) {
    return { ok: false, message: 'הקישור צריך להתחיל ב-/ (עמוד באתר) או ב-https://.' };
  }
  const window = readWindow(form);
  if (typeof window === 'string') return { ok: false, message: window };

  const data = {
    textHe,
    linkHref,
    linkLabelHe: linkHref ? field(form, 'linkLabelHe', 40) || null : null,
    ...window,
    isActive: form.get('active') === 'on',
  };
  if (id) await prisma.announcement.update({ where: { id }, data });
  else await prisma.announcement.create({ data });
  refreshAll();
  redirect('/admin/announcements?saved=1');
}

export async function deleteAnnouncementAction(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  await requireAdminAction();
  const id = field(form, 'id', 40);
  if (!id) return { ok: false, message: 'ההודעה לא נמצאה.' };
  await prisma.announcement.delete({ where: { id } });
  refreshAll();
  redirect('/admin/announcements');
}
