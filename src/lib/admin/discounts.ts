import { prisma } from '@/lib/db';
import { fromShekels, toAgorot } from '@/lib/money';

/**
 * What sales, coupons and announcements share in the admin (D4D.33): dates
 * read in Israel time, amounts in shekels, the catalogue to aim at, and a
 * status in words.
 */

const ZONE = 'Asia/Jerusalem';

/** Milliseconds Israel is ahead of UTC at that instant (DST included). */
function zoneOffset(instant: number): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: ZONE,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(instant));
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second'),
  );
  return asUtc - instant;
}

/**
 * A date from an <input type="date"> as an instant in Israel time: the start
 * of that day, or with `endOfDay` its last moment - so a sale "until the
 * 20th" runs through the 20th.
 */
export function parseIsraelDate(value: string, endOfDay = false): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const [, y, m, d] = match.map(Number) as [number, number, number, number];
  // The wall-clock time read as if it were UTC, then moved back by Israel's
  // offset; the second pass settles the offset on a day the clocks change.
  const wall = Date.UTC(y, m - 1, d, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0);
  const first = wall - zoneOffset(wall);
  return new Date(wall - zoneOffset(first));
}

/** The Israel calendar day of an instant, for an <input type="date">. */
export function israelDateValue(date: Date | null): string {
  if (!date) return '';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** "15" or "15%" -> basis points; null when not a percentage in 1..100. */
export function parsePercent(raw: string): number | null {
  const value = Number(raw.replace(/[%\s]/g, '').replace(',', '.'));
  if (!Number.isFinite(value) || value <= 0 || value > 100) return null;
  return Math.round(value * 100);
}

/** "1,200" / "₪1200" -> agorot; null when not a positive amount. */
export function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[,₪\s]/g, '');
  if (!cleaned) return null;
  try {
    const agorot = toAgorot(fromShekels(cleaned));
    return agorot > 0 ? agorot : null;
  } catch {
    return null;
  }
}

export type WindowStatus = 'live' | 'scheduled' | 'ended' | 'off';

export const WINDOW_STATUS_LABELS: Readonly<Record<WindowStatus, string>> = {
  live: 'פעיל עכשיו',
  scheduled: 'מתוזמן',
  ended: 'הסתיים',
  off: 'כבוי',
};

export function windowStatus(
  row: { isActive: boolean; startsAt: Date | null; endsAt: Date | null },
  now = new Date(),
): WindowStatus {
  if (!row.isActive) return 'off';
  if (row.endsAt && row.endsAt <= now) return 'ended';
  if (row.startsAt && row.startsAt > now) return 'scheduled';
  return 'live';
}

export interface TargetChoices {
  readonly categories: readonly {
    id: string;
    nameHe: string;
    children: { id: string; nameHe: string }[];
  }[];
  readonly collections: readonly { id: string; nameHe: string }[];
  readonly products: readonly { id: string; nameHe: string; categoryHe: string }[];
}

/** Everything a sale or a coupon can be aimed at. */
export async function loadTargetChoices(): Promise<TargetChoices> {
  const [roots, collections, products] = await Promise.all([
    prisma.category.findMany({
      where: { parentId: null, archivedAt: null },
      orderBy: { position: 'asc' },
      select: {
        id: true,
        nameHe: true,
        children: {
          where: { archivedAt: null },
          orderBy: { position: 'asc' },
          select: { id: true, nameHe: true },
        },
      },
    }),
    prisma.collection.findMany({
      where: { archivedAt: null },
      orderBy: { nameHe: 'asc' },
      select: { id: true, nameHe: true },
    }),
    prisma.product.findMany({
      where: { archivedAt: null },
      orderBy: [{ primaryCategory: { position: 'asc' } }, { nameHe: 'asc' }],
      select: { id: true, nameHe: true, primaryCategory: { select: { nameHe: true } } },
    }),
  ]);
  return {
    categories: roots,
    collections,
    products: products.map((p) => ({
      id: p.id,
      nameHe: p.nameHe,
      categoryHe: p.primaryCategory.nameHe,
    })),
  };
}

export type TargetKind = 'PRODUCT' | 'CATEGORY' | 'COLLECTION';

/** The targets a form submitted for its chosen scope; other lists are ignored. */
export function readTargets(form: FormData, kind: TargetKind | null): string[] {
  if (!kind) return [];
  const field = { PRODUCT: 'product', CATEGORY: 'category', COLLECTION: 'collection' }[kind];
  return [
    ...new Set(
      form
        .getAll(field)
        .map(String)
        .filter((id) => /^[a-z0-9]{8,40}$/.test(id)),
    ),
  ];
}

/** A target row for the chosen kind. */
export function targetRow(kind: TargetKind, id: string) {
  return kind === 'PRODUCT'
    ? { productId: id }
    : kind === 'CATEGORY'
      ? { categoryId: id }
      : { collectionId: id };
}
