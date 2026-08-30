import { beforeEach, describe, expect, it } from 'vitest';

import { readInventory, resetDb, testPrisma } from '@/test/db';
import { createVariantWithStock } from '@/test/factories';

import {
  InsufficientStockError,
  adjustStock,
  consumeReservation,
  expireReservations,
  releaseReservation,
  reserveInventory,
} from './reservation';

/**
 * Inventory reservation, against a real PostgreSQL.
 *
 * These are the tests that justify the whole design. Overselling is a race, and
 * a race cannot be demonstrated against a mock — only a real database with real
 * row locks shows whether the invariant holds.
 */

beforeEach(async () => {
  await resetDb();
});

describe('reserveInventory', () => {
  it('holds stock and records the reservation', async () => {
    const { variantId } = await createVariantWithStock({ onHand: 5, policy: 'DENY' });

    const { reservationId, expiresAt } = await reserveInventory(testPrisma, {
      variantId,
      quantity: 2,
    });

    expect(await readInventory(variantId)).toEqual({ onHand: 5, reserved: 2 });
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());

    const reservation = await testPrisma.inventoryReservation.findUniqueOrThrow({
      where: { id: reservationId },
    });
    expect(reservation.status).toBe('ACTIVE');
    expect(reservation.quantity).toBe(2);
  });

  it('refuses to reserve more than is available', async () => {
    const { variantId } = await createVariantWithStock({ onHand: 2, policy: 'DENY' });

    await expect(reserveInventory(testPrisma, { variantId, quantity: 3 })).rejects.toThrow(
      InsufficientStockError,
    );

    // Nothing partially reserved.
    expect(await readInventory(variantId)).toEqual({ onHand: 2, reserved: 0 });
  });

  it('counts existing holds against availability', async () => {
    const { variantId } = await createVariantWithStock({ onHand: 3, policy: 'DENY' });

    await reserveInventory(testPrisma, { variantId, quantity: 2 });

    await expect(reserveInventory(testPrisma, { variantId, quantity: 2 })).rejects.toThrow(
      InsufficientStockError,
    );
    // The last unit is still reservable.
    await expect(reserveInventory(testPrisma, { variantId, quantity: 1 })).resolves.toBeDefined();
    expect(await readInventory(variantId)).toEqual({ onHand: 3, reserved: 3 });
  });

  it('sells a made-to-order variant past zero stock', async () => {
    // Spec section 14: made-to-order is a fallback, not a stock level.
    const { variantId } = await createVariantWithStock({ onHand: 0, policy: 'MADE_TO_ORDER' });

    await expect(reserveInventory(testPrisma, { variantId, quantity: 10 })).resolves.toBeDefined();
    expect(await readInventory(variantId)).toEqual({ onHand: 0, reserved: 10 });
  });

  it('rejects a non-positive quantity before touching the database', async () => {
    const { variantId } = await createVariantWithStock({ onHand: 5, policy: 'DENY' });

    await expect(reserveInventory(testPrisma, { variantId, quantity: 0 })).rejects.toThrow(
      RangeError,
    );
    expect(await readInventory(variantId)).toEqual({ onHand: 5, reserved: 0 });
  });

  it('writes a ledger entry for every hold', async () => {
    const { variantId } = await createVariantWithStock({ onHand: 5, policy: 'DENY' });
    await reserveInventory(testPrisma, { variantId, quantity: 2 });

    const movements = await testPrisma.inventoryMovement.findMany({ where: { variantId } });

    expect(movements).toHaveLength(1);
    expect(movements[0]).toMatchObject({
      reason: 'RESERVATION',
      onHandDelta: 0,
      reservedDelta: 2,
      onHandAfter: 5,
      reservedAfter: 2,
    });
  });
});

describe('concurrency', () => {
  /**
   * THE TEST THIS PHASE EXISTS FOR.
   *
   * Two buyers race for the last unit. A read-then-write implementation lets
   * both through: each reads `available = 1`, each decides yes, each writes.
   * The conditional UPDATE makes the second one affect zero rows, because
   * PostgreSQL re-evaluates the WHERE clause against the committed new row
   * version after the row lock is released.
   */
  it('lets exactly one of two concurrent buyers take the last unit', async () => {
    const { variantId } = await createVariantWithStock({ onHand: 1, policy: 'DENY' });

    const results = await Promise.allSettled([
      reserveInventory(testPrisma, { variantId, quantity: 1 }),
      reserveInventory(testPrisma, { variantId, quantity: 1 }),
    ]);

    const fulfilled = results.filter((result) => result.status === 'fulfilled');
    const rejected = results.filter((result) => result.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(InsufficientStockError);

    // No overselling: exactly one unit is held.
    expect(await readInventory(variantId)).toEqual({ onHand: 1, reserved: 1 });
  });

  it('never oversells under heavy contention', async () => {
    const { variantId } = await createVariantWithStock({ onHand: 5, policy: 'DENY' });

    const results = await Promise.allSettled(
      Array.from({ length: 20 }, () => reserveInventory(testPrisma, { variantId, quantity: 1 })),
    );

    const granted = results.filter((result) => result.status === 'fulfilled').length;

    expect(granted).toBe(5);
    expect(await readInventory(variantId)).toEqual({ onHand: 5, reserved: 5 });
  });

  it('grants every concurrent request for a made-to-order variant', async () => {
    const { variantId } = await createVariantWithStock({ onHand: 0, policy: 'MADE_TO_ORDER' });

    const results = await Promise.allSettled(
      Array.from({ length: 10 }, () => reserveInventory(testPrisma, { variantId, quantity: 1 })),
    );

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(10);
    expect(await readInventory(variantId)).toEqual({ onHand: 0, reserved: 10 });
  });

  it('is refused by the database even if the service layer is bypassed', async () => {
    // The CHECK constraint is the backstop behind the conditional UPDATE.
    const { variantId } = await createVariantWithStock({ onHand: 1, policy: 'DENY' });

    await expect(
      testPrisma.inventory.update({ where: { variantId }, data: { reserved: 99 } }),
    ).rejects.toThrow(/Inventory_deny_cannot_oversell/);
  });
});

describe('releaseReservation', () => {
  it('gives the stock back', async () => {
    const { variantId } = await createVariantWithStock({ onHand: 3, policy: 'DENY' });
    const { reservationId } = await reserveInventory(testPrisma, { variantId, quantity: 2 });

    expect(await releaseReservation(testPrisma, reservationId)).toBe(true);

    expect(await readInventory(variantId)).toEqual({ onHand: 3, reserved: 0 });
    const reservation = await testPrisma.inventoryReservation.findUniqueOrThrow({
      where: { id: reservationId },
    });
    expect(reservation.status).toBe('RELEASED');
    expect(reservation.releasedAt).not.toBeNull();
  });

  it('is idempotent, so a duplicate release cannot double-credit stock', async () => {
    const { variantId } = await createVariantWithStock({ onHand: 3, policy: 'DENY' });
    const { reservationId } = await reserveInventory(testPrisma, { variantId, quantity: 2 });

    expect(await releaseReservation(testPrisma, reservationId)).toBe(true);
    expect(await releaseReservation(testPrisma, reservationId)).toBe(false);

    expect(await readInventory(variantId)).toEqual({ onHand: 3, reserved: 0 });
  });

  it('makes released stock reservable again', async () => {
    const { variantId } = await createVariantWithStock({ onHand: 1, policy: 'DENY' });
    const first = await reserveInventory(testPrisma, { variantId, quantity: 1 });

    await expect(reserveInventory(testPrisma, { variantId, quantity: 1 })).rejects.toThrow(
      InsufficientStockError,
    );

    await releaseReservation(testPrisma, first.reservationId);

    await expect(reserveInventory(testPrisma, { variantId, quantity: 1 })).resolves.toBeDefined();
  });
});

describe('consumeReservation', () => {
  it('turns a hold into a sale', async () => {
    const { variantId } = await createVariantWithStock({ onHand: 3, policy: 'DENY' });
    const { reservationId } = await reserveInventory(testPrisma, { variantId, quantity: 2 });

    expect(await consumeReservation(testPrisma, reservationId)).toBe(true);

    // Both counters drop: the units were already committed, so `available` is
    // unchanged by the sale itself.
    expect(await readInventory(variantId)).toEqual({ onHand: 1, reserved: 0 });

    const reservation = await testPrisma.inventoryReservation.findUniqueOrThrow({
      where: { id: reservationId },
    });
    expect(reservation.status).toBe('CONSUMED');
    expect(reservation.consumedAt).not.toBeNull();
  });

  it('is idempotent, which payment webhook retries require', async () => {
    const { variantId } = await createVariantWithStock({ onHand: 3, policy: 'DENY' });
    const { reservationId } = await reserveInventory(testPrisma, { variantId, quantity: 2 });

    expect(await consumeReservation(testPrisma, reservationId)).toBe(true);
    expect(await consumeReservation(testPrisma, reservationId)).toBe(false);

    expect(await readInventory(variantId)).toEqual({ onHand: 1, reserved: 0 });
  });

  it('records the sale in the ledger', async () => {
    const { variantId } = await createVariantWithStock({ onHand: 3, policy: 'DENY' });
    const { reservationId } = await reserveInventory(testPrisma, { variantId, quantity: 2 });
    await consumeReservation(testPrisma, reservationId);

    const sale = await testPrisma.inventoryMovement.findFirstOrThrow({
      where: { variantId, reason: 'SALE' },
    });

    expect(sale).toMatchObject({
      onHandDelta: -2,
      reservedDelta: -2,
      onHandAfter: 1,
      reservedAfter: 0,
    });
  });

  it('does not drive a made-to-order sale below zero stock', async () => {
    const { variantId } = await createVariantWithStock({ onHand: 0, policy: 'MADE_TO_ORDER' });
    const { reservationId } = await reserveInventory(testPrisma, { variantId, quantity: 3 });

    await consumeReservation(testPrisma, reservationId);

    expect(await readInventory(variantId)).toEqual({ onHand: 0, reserved: 0 });
  });
});

describe('expireReservations', () => {
  it('releases holds whose expiry has passed', async () => {
    const { variantId } = await createVariantWithStock({ onHand: 5, policy: 'DENY' });
    const { reservationId } = await reserveInventory(testPrisma, {
      variantId,
      quantity: 2,
      ttlMs: -1_000, // already expired
    });

    expect(await expireReservations(testPrisma)).toBe(1);

    expect(await readInventory(variantId)).toEqual({ onHand: 5, reserved: 0 });
    const reservation = await testPrisma.inventoryReservation.findUniqueOrThrow({
      where: { id: reservationId },
    });
    expect(reservation.status).toBe('EXPIRED');
  });

  it('leaves live holds alone', async () => {
    const { variantId } = await createVariantWithStock({ onHand: 5, policy: 'DENY' });
    await reserveInventory(testPrisma, { variantId, quantity: 2 });

    expect(await expireReservations(testPrisma)).toBe(0);
    expect(await readInventory(variantId)).toEqual({ onHand: 5, reserved: 2 });
  });

  it('does not expire a hold that was already consumed', async () => {
    const { variantId } = await createVariantWithStock({ onHand: 5, policy: 'DENY' });
    const { reservationId } = await reserveInventory(testPrisma, {
      variantId,
      quantity: 2,
      ttlMs: -1_000,
    });
    await consumeReservation(testPrisma, reservationId);

    expect(await expireReservations(testPrisma)).toBe(0);
    // The sale stands; stock is not credited back.
    expect(await readInventory(variantId)).toEqual({ onHand: 3, reserved: 0 });
  });

  it('stops the reserved counter ratcheting upward on abandoned checkouts', async () => {
    // The failure mode that motivated InventoryReservation existing at all.
    const { variantId } = await createVariantWithStock({ onHand: 2, policy: 'DENY' });

    for (let attempt = 0; attempt < 2; attempt += 1) {
      await reserveInventory(testPrisma, { variantId, quantity: 1, ttlMs: -1_000 });
    }
    expect(await readInventory(variantId)).toEqual({ onHand: 2, reserved: 2 });

    // Without the sweeper the variant is now permanently unsellable.
    await expireReservations(testPrisma);

    expect(await readInventory(variantId)).toEqual({ onHand: 2, reserved: 0 });
    await expect(reserveInventory(testPrisma, { variantId, quantity: 2 })).resolves.toBeDefined();
  });
});

describe('adjustStock', () => {
  it('sets an absolute stock level and records the delta', async () => {
    const { variantId } = await createVariantWithStock({ onHand: 2, policy: 'DENY' });

    await adjustStock(testPrisma, { variantId, onHand: 7, reason: 'MANUAL_ADJUSTMENT' });

    expect(await readInventory(variantId)).toEqual({ onHand: 7, reserved: 0 });

    const movement = await testPrisma.inventoryMovement.findFirstOrThrow({
      where: { variantId, reason: 'MANUAL_ADJUSTMENT' },
    });
    expect(movement).toMatchObject({ onHandDelta: 5, onHandAfter: 7 });
  });

  it('refuses a negative stock level', async () => {
    const { variantId } = await createVariantWithStock({ onHand: 2, policy: 'DENY' });

    await expect(
      adjustStock(testPrisma, { variantId, onHand: -1, reason: 'MANUAL_ADJUSTMENT' }),
    ).rejects.toThrow(RangeError);
  });

  it('cannot cut stock below what is already reserved on a DENY variant', async () => {
    const { variantId } = await createVariantWithStock({ onHand: 3, policy: 'DENY' });
    await reserveInventory(testPrisma, { variantId, quantity: 3 });

    await expect(
      adjustStock(testPrisma, { variantId, onHand: 1, reason: 'MANUAL_ADJUSTMENT' }),
    ).rejects.toThrow(/Inventory_deny_cannot_oversell/);
  });
});

describe('inventory ledger', () => {
  it('is append-only across a full reserve-and-sell lifecycle', async () => {
    const { variantId } = await createVariantWithStock({ onHand: 5, policy: 'DENY' });

    const first = await reserveInventory(testPrisma, { variantId, quantity: 2 });
    await consumeReservation(testPrisma, first.reservationId);
    const second = await reserveInventory(testPrisma, { variantId, quantity: 1 });
    await releaseReservation(testPrisma, second.reservationId);

    const movements = await testPrisma.inventoryMovement.findMany({
      where: { variantId },
      orderBy: { createdAt: 'asc' },
    });

    expect(movements.map((movement) => movement.reason)).toEqual([
      'RESERVATION',
      'SALE',
      'RESERVATION',
      'RELEASE',
    ]);
    // The last recorded state matches the live counters, so the ledger
    // explains how inventory got where it is.
    expect(movements.at(-1)).toMatchObject({ onHandAfter: 3, reservedAfter: 0 });
    expect(await readInventory(variantId)).toEqual({ onHand: 3, reserved: 0 });
  });
});
