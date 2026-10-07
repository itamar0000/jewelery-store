import { prisma } from '@/lib/db';
import type { CustomRequestStatus, Prisma } from '@/generated/prisma/client';
import { CHANGE_AREAS, changeAreaLabel, JEWELRY_TYPES } from '@/lib/custom-requests/form';

/**
 * Custom design requests, as the workshop answers them (MASTER_SPECIFICATION
 * 19, D4D.24).
 *
 * The workflow is the specification's: new, under review, quote sent,
 * approved by the customer, in production, completed - or rejected or
 * cancelled. Every move writes a `CustomRequestEvent`, and sending a quote
 * records its amount and date on the request.
 */

export const REQUEST_STATUS_LABELS: Readonly<Record<CustomRequestStatus, string>> = {
  NEW: 'חדשה',
  REVIEWING: 'בבדיקה',
  QUOTE_SENT: 'נשלחה הצעת מחיר',
  CUSTOMER_APPROVED: 'הלקוח אישר',
  PRODUCTION: 'בייצור',
  COMPLETED: 'הושלמה',
  REJECTED: 'נדחתה',
  CANCELLED: 'בוטלה',
};

export const REQUEST_STATUSES = Object.keys(REQUEST_STATUS_LABELS) as CustomRequestStatus[];

const OPEN_STATUSES: CustomRequestStatus[] = [
  'NEW',
  'REVIEWING',
  'QUOTE_SENT',
  'CUSTOMER_APPROVED',
  'PRODUCTION',
];

export function isRequestStatus(value: unknown): value is CustomRequestStatus {
  return typeof value === 'string' && value in REQUEST_STATUS_LABELS;
}

export function jewelryTypeLabel(type: string): string {
  return JEWELRY_TYPES.find((entry) => entry.value === type)?.label ?? type;
}

export function changeAreaLabels(areas: readonly string[], productType: string | null): string[] {
  return areas
    .filter((area): area is (typeof CHANGE_AREAS)[number] =>
      (CHANGE_AREAS as readonly string[]).includes(area),
    )
    .map((area) => changeAreaLabel(area, productType));
}

/** `CustomRequest.productSnapshot` as the form writes it. */
export function readRequestSnapshot(value: unknown): {
  nameHe: string;
  slug: string | null;
  choices: { labelHe: string; valueHe: string }[];
} | null {
  if (typeof value !== 'object' || value === null) return null;
  const snapshot = value as Record<string, unknown>;
  if (typeof snapshot.nameHe !== 'string') return null;
  const choices = Array.isArray(snapshot.choices)
    ? snapshot.choices.flatMap((choice) => {
        const entry = choice as Record<string, unknown>;
        return typeof entry?.labelHe === 'string' && typeof entry?.valueHe === 'string'
          ? [{ labelHe: entry.labelHe, valueHe: entry.valueHe }]
          : [];
      })
    : [];
  return {
    nameHe: snapshot.nameHe,
    slug: typeof snapshot.slug === 'string' ? snapshot.slug : null,
    choices,
  };
}

export async function listRequests(filter: { status?: CustomRequestStatus | 'OPEN' } = {}) {
  const where: Prisma.CustomRequestWhereInput = {};
  if (filter.status === 'OPEN') where.status = { in: OPEN_STATUSES };
  else if (filter.status) where.status = filter.status;

  return prisma.customRequest.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: {
      id: true,
      requestNumber: true,
      createdAt: true,
      fullName: true,
      phone: true,
      email: true,
      jewelryType: true,
      status: true,
      productSnapshot: true,
      description: true,
    },
  });
}

export async function countRequestsByStatus(): Promise<Record<string, number>> {
  const groups = await prisma.customRequest.groupBy({ by: ['status'], _count: { _all: true } });
  const counts: Record<string, number> = {};
  for (const group of groups) counts[group.status] = group._count._all;
  counts.OPEN = OPEN_STATUSES.reduce((sum, status) => sum + (counts[status] ?? 0), 0);
  return counts;
}

export async function getRequestForAdmin(requestNumber: number) {
  return prisma.customRequest.findUnique({
    where: { requestNumber },
    include: {
      product: { select: { slug: true, productType: true } },
      linkedOrder: { select: { orderNumber: true } },
      events: {
        orderBy: { createdAt: 'desc' },
        include: { actor: { select: { displayName: true, email: true } } },
      },
    },
  });
}

export async function updateRequest(input: {
  readonly requestId: string;
  readonly toStatus: CustomRequestStatus;
  readonly note: string | null;
  readonly quoteAgorot: number | null;
  readonly quoteNotes: string | null;
  readonly internalNotes: string | null;
  readonly actorUserId: string;
}): Promise<'saved' | 'missing'> {
  const current = await prisma.customRequest.findUnique({
    where: { id: input.requestId },
    select: { status: true, quoteAgorot: true, quotedAt: true },
  });
  if (!current) return 'missing';

  const statusChanged = current.status !== input.toStatus;
  const quoteChanged = input.quoteAgorot !== current.quoteAgorot;

  await prisma.$transaction([
    prisma.customRequest.update({
      where: { id: input.requestId },
      data: {
        status: input.toStatus,
        quoteAgorot: input.quoteAgorot,
        quoteNotes: input.quoteNotes,
        internalNotes: input.internalNotes,
        // The date a quote went out: set when the status says so, kept after.
        ...(input.toStatus === 'QUOTE_SENT' && (statusChanged || quoteChanged || !current.quotedAt)
          ? { quotedAt: new Date() }
          : {}),
      },
    }),
    ...(statusChanged || input.note
      ? [
          prisma.customRequestEvent.create({
            data: {
              requestId: input.requestId,
              fromStatus: current.status,
              toStatus: input.toStatus,
              actorUserId: input.actorUserId,
              note: input.note,
            },
          }),
        ]
      : []),
  ]);
  return 'saved';
}
