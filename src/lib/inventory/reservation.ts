import { type Prisma } from '@/generated/prisma/client';
import type { PrismaClient } from '@/generated/prisma/client';

/**
 * Inventory reservation.
 *
 * THE CONCURRENCY PROBLEM. A read-then-write reservation —
 *
 *   1. SELECT onHand, reserved
 *   2. decide in application code
 *   3. UPDATE reserved = reserved + qty
 *
 * — is a lost-update race. Two checkouts both read `available = 1`, both decide
 * yes, and both write. The last unit is sold twice.
 *
 * THE FIX is a single conditional UPDATE whose WHERE clause carries the
 * availability test:
 *
 *   UPDATE "Inventory" SET "reserved" = "reserved" + $qty
 *    WHERE "variantId" = $id
 *      AND ("policy" = 'MADE_TO_ORDER' OR "onHand" - "reserved" >= $qty)
 *
 * PostgreSQL takes a row lock for the update. Under READ COMMITTED, a second
 * transaction that blocks on that lock RE-EVALUATES its WHERE clause against
 * the committed new row version once the lock is released — so it sees the
 * incremented `reserved`, the condition fails, and it affects ZERO rows. Zero
 * rows affected is the failure signal; no explicit SELECT ... FOR UPDATE, no
 * advisory lock, no retry loop.
 *
 * The CHECK constraints in the migration are the backstop: even if this module
 * is bypassed entirely, the database refuses to store an oversold state.
 *
 * Every mutation here also writes an `InventoryMovement` row, so a stock
 * discrepancy is always explainable after the fact.
 */

/** Thrown when stock could not be committed. Carries no internal identifiers. */
export class InsufficientStockError extends Error {
  constructor(
    readonly variantId: string,
    readonly requested: number,
  ) {
    super(`Insufficient stock for variant ${variantId}: ${requested} requested.`);
    this.name = 'InsufficientStockError';
  }
}

/** Thrown when a reservation is acted on from a state that does not allow it. */
export class ReservationStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReservationStateError';
  }
}

/**
 * How long a hold survives without being consumed.
 *
 * Long enough for a customer to finish a hosted payment flow, short enough that
 * an abandoned checkout returns the piece to sale the same session. Not a
 * business rule from the specification — a technical default, changed here.
 */
export const RESERVATION_TTL_MS = 20 * 60 * 1000;

/** Prisma client or an interactive transaction handle. */
type Db = PrismaClient | Prisma.TransactionClient;

export interface ReserveInput {
  variantId: string;
  quantity: number;
  orderId?: string | null;
  cartId?: string | null;
  /** Overrides `RESERVATION_TTL_MS`. */
  ttlMs?: number;
  actorUserId?: string | null;
}

export interface ReservationResult {
  reservationId: string;
  expiresAt: Date;
}

/**
 * Read `Inventory` and write the ledger row describing the change just made.
 * Called inside the same transaction as the mutation, so the recorded
 * after-values are the ones that were committed.
 */
async function recordMovement(
  db: Db,
  params: {
    variantId: string;
    onHandDelta: number;
    reservedDelta: number;
    reason:
      | 'INITIAL_STOCK'
      | 'MANUAL_ADJUSTMENT'
      | 'SALE'
      | 'RESERVATION'
      | 'RELEASE'
      | 'RETURN'
      | 'OTHER';
    orderId?: string | null;
    reservationId?: string | null;
    actorUserId?: string | null;
    note?: string | null;
  },
): Promise<void> {
  const inventory = await db.inventory.findUniqueOrThrow({
    where: { variantId: params.variantId },
    select: { onHand: true, reserved: true },
  });

  await db.inventoryMovement.create({
    data: {
      variantId: params.variantId,
      onHandDelta: params.onHandDelta,
      reservedDelta: params.reservedDelta,
      reason: params.reason,
      onHandAfter: inventory.onHand,
      reservedAfter: inventory.reserved,
      orderId: params.orderId ?? null,
      reservationId: params.reservationId ?? null,
      actorUserId: params.actorUserId ?? null,
      note: params.note ?? null,
    },
  });
}

/**
 * Hold stock for a checkout.
 *
 * Succeeds when the variant is MADE_TO_ORDER (which sells past zero by design,
 * section 14) or when enough uncommitted stock exists. Throws
 * `InsufficientStockError` otherwise — it never partially reserves.
 *
 * Runs in its own transaction unless one is supplied, so the counter increment,
 * the reservation row and the ledger entry commit or roll back together.
 */
export async function reserveInventory(
  client: PrismaClient,
  input: ReserveInput,
  tx?: Prisma.TransactionClient,
): Promise<ReservationResult> {
  if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
    throw new RangeError(
      `Reservation quantity must be a positive integer, received ${input.quantity}.`,
    );
  }

  const run = async (db: Db): Promise<ReservationResult> => {
    // The atomic step. `$executeRaw` returns the number of rows affected;
    // zero means the availability condition was false at the moment the row
    // lock was granted.
    const affected = await db.$executeRaw`
      UPDATE "Inventory"
         SET "reserved" = "reserved" + ${input.quantity},
             "updatedAt" = NOW()
       WHERE "variantId" = ${input.variantId}
         AND ("policy" = 'MADE_TO_ORDER'
              OR "onHand" - "reserved" >= ${input.quantity})
    `;

    if (affected === 0) {
      throw new InsufficientStockError(input.variantId, input.quantity);
    }

    const expiresAt = new Date(Date.now() + (input.ttlMs ?? RESERVATION_TTL_MS));

    const reservation = await db.inventoryReservation.create({
      data: {
        variantId: input.variantId,
        quantity: input.quantity,
        orderId: input.orderId ?? null,
        cartId: input.cartId ?? null,
        status: 'ACTIVE',
        expiresAt,
      },
      select: { id: true, expiresAt: true },
    });

    await recordMovement(db, {
      variantId: input.variantId,
      onHandDelta: 0,
      reservedDelta: input.quantity,
      reason: 'RESERVATION',
      orderId: input.orderId,
      reservationId: reservation.id,
      actorUserId: input.actorUserId,
    });

    return { reservationId: reservation.id, expiresAt: reservation.expiresAt };
  };

  return tx ? run(tx) : client.$transaction(run);
}

/**
 * Give a hold back — payment failed, the customer abandoned checkout, or an
 * admin cancelled.
 *
 * Idempotent by construction: the status transition is a conditional
 * `updateMany` on `status = 'ACTIVE'`, so a duplicate release affects zero rows
 * and returns `false` rather than decrementing `reserved` twice.
 */
export async function releaseReservation(
  client: PrismaClient,
  reservationId: string,
  options: { reason?: 'RELEASE' | 'RETURN'; actorUserId?: string | null } = {},
): Promise<boolean> {
  return client.$transaction(async (db) => {
    const reservation = await db.inventoryReservation.findUnique({
      where: { id: reservationId },
      select: { variantId: true, quantity: true, orderId: true, status: true },
    });

    if (!reservation) {
      throw new ReservationStateError(`Reservation ${reservationId} does not exist.`);
    }

    const transitioned = await db.inventoryReservation.updateMany({
      where: { id: reservationId, status: 'ACTIVE' },
      data: { status: 'RELEASED', releasedAt: new Date() },
    });

    if (transitioned.count === 0) return false;

    await db.$executeRaw`
      UPDATE "Inventory"
         SET "reserved" = "reserved" - ${reservation.quantity},
             "updatedAt" = NOW()
       WHERE "variantId" = ${reservation.variantId}
    `;

    await recordMovement(db, {
      variantId: reservation.variantId,
      onHandDelta: 0,
      reservedDelta: -reservation.quantity,
      reason: options.reason ?? 'RELEASE',
      orderId: reservation.orderId,
      reservationId,
      actorUserId: options.actorUserId,
    });

    return true;
  });
}

/**
 * Turn a hold into a sale, on confirmed payment.
 *
 * Stock leaves the building: `onHand` and `reserved` both drop by the reserved
 * quantity, so `available` is unchanged — the units were already committed.
 *
 * Idempotent in the same way as `releaseReservation`, which matters because
 * payment webhooks are retried.
 */
export async function consumeReservation(
  client: PrismaClient,
  reservationId: string,
  options: { actorUserId?: string | null } = {},
): Promise<boolean> {
  return client.$transaction(async (db) => {
    const reservation = await db.inventoryReservation.findUnique({
      where: { id: reservationId },
      select: { variantId: true, quantity: true, orderId: true },
    });

    if (!reservation) {
      throw new ReservationStateError(`Reservation ${reservationId} does not exist.`);
    }

    const transitioned = await db.inventoryReservation.updateMany({
      where: { id: reservationId, status: 'ACTIVE' },
      data: { status: 'CONSUMED', consumedAt: new Date() },
    });

    if (transitioned.count === 0) return false;

    // A made-to-order sale can legitimately drive onHand to zero but never
    // below it; the CHECK constraint enforces that. `GREATEST` keeps a
    // made-to-order sale from attempting a negative balance in the first place,
    // so the sale succeeds and the ledger records what actually happened.
    await db.$executeRaw`
      UPDATE "Inventory"
         SET "onHand"   = GREATEST(0, "onHand" - ${reservation.quantity}),
             "reserved" = "reserved" - ${reservation.quantity},
             "updatedAt" = NOW()
       WHERE "variantId" = ${reservation.variantId}
    `;

    await recordMovement(db, {
      variantId: reservation.variantId,
      onHandDelta: -reservation.quantity,
      reservedDelta: -reservation.quantity,
      reason: 'SALE',
      orderId: reservation.orderId,
      reservationId,
      actorUserId: options.actorUserId,
    });

    return true;
  });
}

/**
 * Release every hold whose `expiresAt` has passed.
 *
 * Without this the `reserved` counter only ever grows: each abandoned checkout
 * permanently removes stock from sale (DATA_MODEL_REVIEW F7). Intended to run
 * on a schedule.
 *
 * Reservations are expired one at a time, each in its own transaction, so a
 * single bad row cannot block the whole sweep.
 */
export async function expireReservations(
  client: PrismaClient,
  now: Date = new Date(),
): Promise<number> {
  const expired = await client.inventoryReservation.findMany({
    where: { status: 'ACTIVE', expiresAt: { lte: now } },
    select: { id: true, variantId: true, quantity: true, orderId: true },
  });

  let released = 0;

  for (const reservation of expired) {
    const didExpire = await client.$transaction(async (db) => {
      const transitioned = await db.inventoryReservation.updateMany({
        where: { id: reservation.id, status: 'ACTIVE' },
        data: { status: 'EXPIRED', releasedAt: now },
      });

      if (transitioned.count === 0) return false;

      await db.$executeRaw`
        UPDATE "Inventory"
           SET "reserved" = "reserved" - ${reservation.quantity},
               "updatedAt" = NOW()
         WHERE "variantId" = ${reservation.variantId}
      `;

      await recordMovement(db, {
        variantId: reservation.variantId,
        onHandDelta: 0,
        reservedDelta: -reservation.quantity,
        reason: 'RELEASE',
        orderId: reservation.orderId,
        reservationId: reservation.id,
        note: 'Reservation expired',
      });

      return true;
    });

    if (didExpire) released += 1;
  }

  return released;
}

/**
 * Set stock to an absolute figure — receiving goods, or an admin correction.
 *
 * Absolute rather than a delta because that is how a stock count works: someone
 * counts what is on the shelf. The ledger records the delta that resulted.
 */
export async function adjustStock(
  client: PrismaClient,
  params: {
    variantId: string;
    onHand: number;
    reason: 'INITIAL_STOCK' | 'MANUAL_ADJUSTMENT' | 'RETURN' | 'OTHER';
    actorUserId?: string | null;
    note?: string | null;
  },
): Promise<void> {
  if (!Number.isInteger(params.onHand) || params.onHand < 0) {
    throw new RangeError(`onHand must be a non-negative integer, received ${params.onHand}.`);
  }

  await client.$transaction(async (db) => {
    const before = await db.inventory.findUniqueOrThrow({
      where: { variantId: params.variantId },
      select: { onHand: true },
    });

    await db.inventory.update({
      where: { variantId: params.variantId },
      data: { onHand: params.onHand },
    });

    await recordMovement(db, {
      variantId: params.variantId,
      onHandDelta: params.onHand - before.onHand,
      reservedDelta: 0,
      reason: params.reason,
      actorUserId: params.actorUserId,
      note: params.note,
    });
  });
}
