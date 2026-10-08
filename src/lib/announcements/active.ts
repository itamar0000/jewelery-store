import { prisma } from '@/lib/db';

export interface ActiveAnnouncement {
  readonly id: string;
  readonly textHe: string;
  readonly linkHref: string | null;
  readonly linkLabelHe: string | null;
}

/**
 * The announcement to show now (D4D.33): switched on, inside its dates, the
 * newest when more than one qualifies. One line at a time - a stack of
 * notices above the header would push the shop below the fold.
 */
export async function getActiveAnnouncement(): Promise<ActiveAnnouncement | null> {
  const now = new Date();
  return prisma.announcement.findFirst({
    where: {
      isActive: true,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
      ],
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true, textHe: true, linkHref: true, linkLabelHe: true },
  });
}
