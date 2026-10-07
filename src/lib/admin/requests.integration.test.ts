import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetDb, testPrisma } from '@/test/db';

/**
 * Handling a custom request from the admin, against a real PostgreSQL
 * (D4D.24): each status move is history with its author, and a quote records
 * its amount and the date it went out.
 */
vi.mock('@/lib/db', () => ({ prisma: testPrisma }));

const { submitCustomRequest } = await import('@/lib/custom-requests/submit');
const { getRequestForAdmin, listRequests, updateRequest } = await import('./requests');

let staffId: string;
let requestNumber: number;

beforeEach(async () => {
  await resetDb();
  staffId = (
    await testPrisma.user.create({
      data: { email: 'owner@shop.test', role: 'ADMIN', displayName: 'בעלים' },
    })
  ).id;
  const submitted = await submitCustomRequest({
    fullName: 'נועה',
    phone: '050-1112223',
    email: null,
    jewelryType: 'RING',
    description: 'טבעת סוליטר בזהב אדום, יהלום של חצי קראט.',
  });
  if (!submitted.ok) throw new Error(`fixture request failed: ${JSON.stringify(submitted)}`);
  requestNumber = submitted.requestNumber;
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

describe('updateRequest', () => {
  it('sends a quote: amount, date, status and history', async () => {
    const request = await getRequestForAdmin(requestNumber);
    expect(request?.status).toBe('NEW');
    expect((await listRequests({ status: 'OPEN' })).map((row) => row.requestNumber)).toEqual([
      requestNumber,
    ]);

    await updateRequest({
      requestId: request!.id,
      toStatus: 'QUOTE_SENT',
      note: 'נשלח בוואטסאפ',
      quoteAgorot: 480_000,
      quoteNotes: 'כולל יהלום מעבדה 0.50',
      internalNotes: null,
      actorUserId: staffId,
    });

    const after = await getRequestForAdmin(requestNumber);
    expect(after).toMatchObject({
      status: 'QUOTE_SENT',
      quoteAgorot: 480_000,
      quoteNotes: 'כולל יהלום מעבדה 0.50',
    });
    expect(after?.quotedAt).toBeInstanceOf(Date);
    expect(after?.events[0]).toMatchObject({
      fromStatus: 'NEW',
      toStatus: 'QUOTE_SENT',
      note: 'נשלח בוואטסאפ',
      actor: { displayName: 'בעלים' },
    });
  });

  it('saves notes without inventing a status change', async () => {
    const request = await getRequestForAdmin(requestNumber);
    const historyBefore = request!.events.length;
    await updateRequest({
      requestId: request!.id,
      toStatus: 'NEW',
      note: null,
      quoteAgorot: null,
      quoteNotes: null,
      internalNotes: 'לבדוק זמינות אבן',
      actorUserId: staffId,
    });
    const after = await getRequestForAdmin(requestNumber);
    expect(after?.internalNotes).toBe('לבדוק זמינות אבן');
    expect(after?.events).toHaveLength(historyBefore);
  });
});
