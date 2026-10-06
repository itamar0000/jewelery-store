import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { toAgorot } from '@/lib/money';
import { resetDb, testPrisma } from '@/test/db';
import { createPersonalisedRing, ringLine } from '@/test/ring-fixture';

/**
 * The guest cart against a real PostgreSQL: what it accepts, how it prices,
 * and what it refuses. Same `@/lib/db` mock as the other integration tests.
 */
vi.mock('@/lib/db', () => ({ prisma: testPrisma }));

const { addItem, getCartCount, getCartView, removeItem, setItemQuantity } = await import('./store');
const { MAX_LINE_QUANTITY } = await import('./pricing');

let ring: Awaited<ReturnType<typeof createPersonalisedRing>>;

beforeEach(async () => {
  await resetDb();
  ring = await createPersonalisedRing();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

/** Add a line and return the token the browser would now hold. */
async function add(token: string | null, payload: unknown) {
  const { result, token: next } = await addItem(token, payload);
  return { result, token: next };
}

describe('reading', () => {
  it('reads no token, a malformed token and an unknown token as an empty bag', async () => {
    for (const token of [null, 'not a token', 'x'.repeat(32)]) {
      const view = await getCartView(token);
      expect(view.lines).toHaveLength(0);
      expect(toAgorot(view.total)).toBe(0);
      expect(await getCartCount(token)).toBe(0);
    }
  });

  it('ignores a cart past its expiry', async () => {
    const { token } = await add(null, ringLine(ring.yellow.id));
    await testPrisma.cart.update({
      where: { token: token! },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    expect((await getCartView(token)).lines).toHaveLength(0);
    expect(await getCartCount(token)).toBe(0);
  });
});

describe('adding', () => {
  it('opens a cart on the first add and prices the line from the catalogue', async () => {
    const { result, token } = await add(null, ringLine(ring.yellow.id, { quantity: 2 }));

    expect(result).toEqual({ ok: true, itemCount: 2 });
    expect(token).toMatch(/^[A-Za-z0-9_-]{32}$/);

    const view = await getCartView(token);
    const line = view.lines[0]!;

    expect(line.productName).toBe('טבעת חריטה');
    expect(line.variantLabel).toBe('זהב צהוב');
    expect(line.selections).toEqual([{ label: 'מידת טבעת', value: '52' }]);
    expect(line.personalization).toEqual([
      { label: 'שם לחריטה', value: 'מיכל' },
      { label: 'שפת החריטה', value: 'עברית' },
    ]);
    // 1,000 + the engraving's 90, twice.
    expect(toAgorot(line.unitPrice)).toBe(100_000);
    expect(toAgorot(line.personalizationPrice)).toBe(9_000);
    expect(toAgorot(line.lineTotal)).toBe(218_000);
    expect(toAgorot(view.subtotal)).toBe(218_000);
    expect(toAgorot(view.shipping)).toBe(0);
    expect(toAgorot(view.total)).toBe(218_000);
    expect(line.leadTimeDays).toBe(10);
    expect(line.available).toBe(true);
  });

  it('ignores a price sent by the browser', async () => {
    const { token } = await add(null, { ...ringLine(ring.yellow.id), unitPriceAgorot: 1 });

    expect(toAgorot((await getCartView(token)).lines[0]!.unitPrice)).toBe(100_000);
  });

  it('asks for the choices a piece needs, and opens no cart until it has them', async () => {
    const { result, token } = await add(null, ringLine(ring.yellow.id, { size: null, name: '' }));

    expect(result).toEqual({
      ok: false,
      error: 'needs-choices',
      problems: [
        { field: 'ring_size', reason: 'missing' },
        { field: 'name', reason: 'missing' },
      ],
    });
    expect(token).toBeNull();
    expect(await testPrisma.cart.count()).toBe(0);
  });

  it('refuses a withdrawn size, an overlong engraving and an unknown language', async () => {
    const { result } = await add(
      null,
      ringLine(ring.yellow.id, { size: '60', name: 'שם ארוך מדי לחריטה', language: 'fr' }),
    );

    expect(result).toMatchObject({ ok: false, error: 'needs-choices' });
    expect(result.ok ? [] : result.problems).toEqual([
      { field: 'ring_size', reason: 'invalid' },
      { field: 'name', reason: 'invalid' },
      { field: 'language', reason: 'invalid' },
    ]);
  });

  it('treats a choice for an option the piece does not have as a bad request', async () => {
    const payload = ringLine(ring.yellow.id);
    payload.selections.push({
      optionCode: 'length',
      optionLabelHe: 'אורך',
      value: '45CM',
      valueLabelHe: '45',
    });

    expect((await add(null, payload)).result).toEqual({ ok: false, error: 'invalid' });
  });

  it('adds the same piece configured the same way to the line already there', async () => {
    const first = await add(null, ringLine(ring.yellow.id));
    const second = await add(first.token, ringLine(ring.yellow.id, { notes: '  ' }));

    expect(second.token).toBe(first.token);
    expect(second.result).toEqual({ ok: true, itemCount: 2 });
    expect((await getCartView(first.token)).lines).toHaveLength(1);
  });

  it('keeps differently engraved pieces on separate lines', async () => {
    const first = await add(null, ringLine(ring.yellow.id, { name: 'מיכל' }));
    await add(first.token, ringLine(ring.yellow.id, { name: 'נועה' }));

    expect((await getCartView(first.token)).lines).toHaveLength(2);
  });

  it(`holds at most ${MAX_LINE_QUANTITY} of one line`, async () => {
    const first = await add(null, ringLine(ring.yellow.id, { quantity: 8 }));
    const second = await add(first.token, ringLine(ring.yellow.id, { quantity: 8 }));

    expect(second.result).toEqual({ ok: true, itemCount: MAX_LINE_QUANTITY });
  });

  it('will not put more of a stocked piece in the bag than there is', async () => {
    const first = await add(null, ringLine(ring.white.id));
    const second = await add(first.token, ringLine(ring.white.id));

    expect(first.result.ok).toBe(true);
    expect(second.result).toEqual({ ok: false, error: 'unavailable' });
    expect(await getCartCount(first.token)).toBe(1);
  });

  it('refuses a piece that is not on sale', async () => {
    await testPrisma.product.update({
      where: { id: ring.productId },
      data: { publishedAt: null },
    });

    expect((await add(null, ringLine(ring.yellow.id))).result).toEqual({
      ok: false,
      error: 'unavailable',
    });
  });

  it('starts a fresh cart when the old one has expired', async () => {
    const first = await add(null, ringLine(ring.yellow.id));
    await testPrisma.cart.update({
      where: { token: first.token! },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const second = await add(first.token, ringLine(ring.yellow.id));

    expect(second.token).not.toBe(first.token);
    expect(second.result).toEqual({ ok: true, itemCount: 1 });
  });
});

describe('a line that stops being orderable', () => {
  it('stays in the bag, marked, and leaves the totals', async () => {
    const { token } = await add(null, ringLine(ring.yellow.id));
    await add(token, ringLine(ring.white.id));

    await testPrisma.productVariant.update({
      where: { id: ring.white.id },
      data: { archivedAt: new Date() },
    });

    const view = await getCartView(token);

    expect(view.lines.map((line) => line.available)).toEqual([true, false]);
    expect(view.hasUnavailable).toBe(true);
    expect(toAgorot(view.total)).toBe(109_000);
    expect(view.itemCount).toBe(1);
    // The header still counts what is in the bag.
    expect(await getCartCount(token)).toBe(2);
  });

  it('is caught when a field it was added without becomes required', async () => {
    const { token } = await add(null, ringLine(ring.yellow.id));
    await testPrisma.customizationField.updateMany({
      where: { key: 'notes' },
      data: { isRequired: true },
    });

    expect((await getCartView(token)).lines[0]!.available).toBe(false);
  });

  it('reprices when the catalogue price changes', async () => {
    const { token } = await add(null, ringLine(ring.yellow.id));
    await testPrisma.productVariant.update({
      where: { id: ring.yellow.id },
      data: { priceAgorot: 150_000 },
    });

    expect(toAgorot((await getCartView(token)).total)).toBe(159_000);
  });
});

describe('changing and removing', () => {
  it('changes a quantity, clamped to the line maximum', async () => {
    const { token } = await add(null, ringLine(ring.yellow.id));
    const lineId = (await getCartView(token)).lines[0]!.id;

    expect(await setItemQuantity(token, { cartItemId: lineId, quantity: 3 })).toEqual({
      ok: true,
      itemCount: 3,
    });
    expect(await setItemQuantity(token, { cartItemId: lineId, quantity: 500 })).toEqual({
      ok: true,
      itemCount: MAX_LINE_QUANTITY,
    });
  });

  it('refuses a quantity of a stocked piece beyond what is there', async () => {
    const { token } = await add(null, ringLine(ring.white.id));
    const lineId = (await getCartView(token)).lines[0]!.id;

    expect(await setItemQuantity(token, { cartItemId: lineId, quantity: 2 })).toEqual({
      ok: false,
      error: 'unavailable',
    });
  });

  it('touches only lines in the cart the token opens', async () => {
    const mine = await add(null, ringLine(ring.yellow.id));
    const theirs = await add(null, ringLine(ring.yellow.id, { name: 'דנה' }));
    const theirLine = (await getCartView(theirs.token)).lines[0]!.id;

    expect(await setItemQuantity(mine.token, { cartItemId: theirLine, quantity: 5 })).toEqual({
      ok: false,
      error: 'not-found',
    });
    expect(await removeItem(mine.token, theirLine)).toEqual({ ok: false, error: 'not-found' });
    expect(await getCartCount(theirs.token)).toBe(1);
  });

  it('removes a line', async () => {
    const { token } = await add(null, ringLine(ring.yellow.id));
    const lineId = (await getCartView(token)).lines[0]!.id;

    const removed = await removeItem(token, lineId);
    expect(removed).toMatchObject({ ok: true, itemCount: 0 });
    expect((await getCartView(token)).lines).toHaveLength(0);
  });

  it('hands back the removed line, which adds back exactly as it was', async () => {
    const { token } = await add(null, ringLine(ring.yellow.id));
    const before = (await getCartView(token)).lines[0]!;

    const removed = await removeItem(token, before.id);
    if (!removed.ok || !removed.restore) throw new Error('no restore');
    expect(removed.restore.variantId).toBe(ring.yellow.id);

    const { result } = await add(token, removed.restore);
    expect(result.ok).toBe(true);

    const after = (await getCartView(token)).lines[0]!;
    expect(after.selections).toEqual(before.selections);
    expect(after.personalization).toEqual(before.personalization);
    expect(after.lineTotal).toEqual(before.lineTotal);
  });
});
