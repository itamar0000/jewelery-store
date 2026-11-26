import { timingSafeEqual } from 'node:crypto';

import { cancelStaleUnpaidOrders } from '@/lib/admin/order-workflow';
import { prisma } from '@/lib/db';
import { env } from '@/lib/env';
import { expireReservations } from '@/lib/inventory/reservation';

/**
 * The daily clean-up, called by Vercel Cron (vercel.json).
 *
 *   1. Stock holds past their expiry go back on sale (`expireReservations`).
 *      Without this the "reserved" count only ever grows.
 *   2. Orders unpaid for three days are cancelled with a history line, so the
 *      owner's lists hold real orders, not abandoned payment pages.
 *
 * Vercel sends "Authorization: Bearer $CRON_SECRET". With no secret set the
 * route refuses everything, so it cannot be triggered by a passer-by.
 */
export const dynamic = 'force-dynamic';

function authorised(header: string | null): boolean {
  const secret = env.CRON_SECRET;
  if (!secret || !header) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export async function GET(request: Request) {
  if (!authorised(request.headers.get('authorization'))) {
    return new Response('Unauthorized', { status: 401 });
  }

  const released = await expireReservations(prisma);
  const cancelled = await cancelStaleUnpaidOrders();
  return Response.json({ released, cancelled });
}
