import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { FIRST_CUSTOM_REQUEST_NUMBER } from '@/lib/orders/order-number';
import { resetDb, testPrisma } from '@/test/db';
import { createPersonalisedRing } from '@/test/ring-fixture';

/**
 * Saving a custom request, against a real PostgreSQL.
 *
 * The promises under test are the receipt's: the request is saved with a
 * number, it records the model and the choices in the catalogue's own words,
 * one way back is enough, and nothing invented in the browser is stored.
 */
vi.mock('@/lib/db', () => ({ prisma: testPrisma }));

const { PER_CONTACT_LIMIT, SITE_HOURLY_LIMIT, submitCustomRequest } = await import('./submit');

let slug: string;

beforeEach(async () => {
  await resetDb();
  const ring = await createPersonalisedRing();
  slug = (await testPrisma.product.findUniqueOrThrow({ where: { id: ring.productId } })).slug;
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

const VISITOR = {
  fullName: 'מיכל כהן',
  phone: '050-1234567',
  email: null,
  description: 'אותה טבעת בזהב אדום, במידה 55.',
};

describe('submitCustomRequest', () => {
  it('saves a request from a model with its choices, numbered and NEW', async () => {
    const result = await submitCustomRequest({
      ...VISITOR,
      productSlug: slug,
      choices: { color: 'white', size: '52' },
      changeAreas: ['gold_color', 'size'],
    });

    expect(result).toEqual({ ok: true, requestNumber: FIRST_CUSTOM_REQUEST_NUMBER });

    const saved = await testPrisma.customRequest.findFirstOrThrow({ include: { events: true } });
    expect(saved).toMatchObject({
      fullName: 'מיכל כהן',
      phone: '050-1234567',
      email: null,
      jewelryType: 'RING',
      status: 'NEW',
      changeAreas: ['gold_color', 'size'],
      productSnapshot: {
        slug,
        choices: [
          { labelHe: 'גוון זהב', valueHe: 'זהב לבן' },
          { labelHe: 'מידת טבעת', valueHe: '52' },
        ],
      },
    });
    expect(saved.productId).not.toBeNull();
    expect(saved.events).toHaveLength(1);
    expect(saved.events[0]).toMatchObject({ fromStatus: null, toStatus: 'NEW' });
  });

  it('drops a choice the model does not offer, and an inactive one', async () => {
    await submitCustomRequest({
      ...VISITOR,
      productSlug: slug,
      choices: { color: 'purple', size: '60' },
    });

    const saved = await testPrisma.customRequest.findFirstOrThrow();
    expect(saved.productSnapshot).toMatchObject({ choices: [] });
  });

  it('starts from scratch with an email only', async () => {
    const result = await submitCustomRequest({
      fullName: 'יעל',
      phone: '',
      email: 'yael@example.test',
      jewelryType: 'NECKLACE',
      description: 'תליון עם האות י בזהב צהוב.',
    });

    expect(result.ok).toBe(true);
    const saved = await testPrisma.customRequest.findFirstOrThrow();
    expect(saved).toMatchObject({ phone: null, jewelryType: 'NECKLACE', productId: null });
  });

  it('asks for a way back when neither phone nor email is given', async () => {
    const result = await submitCustomRequest({ ...VISITOR, phone: '', jewelryType: 'RING' });

    expect(result).toEqual({ ok: false, error: 'invalid', problems: { phone: 'contact' } });
    expect(await testPrisma.customRequest.count()).toBe(0);
  });

  it('asks for the kind of jewellery without a model, and ignores an unknown model', async () => {
    const result = await submitCustomRequest({ ...VISITOR, productSlug: 'no-such-model' });

    expect(result).toEqual({ ok: false, error: 'invalid', problems: { jewelryType: 'missing' } });
  });

  it('refuses a filled trap field without saving', async () => {
    const result = await submitCustomRequest({ ...VISITOR, jewelryType: 'RING', website: 'x' });

    expect(result).toEqual({ ok: false, error: 'failed' });
    expect(await testPrisma.customRequest.count()).toBe(0);
  });

  it('caps requests from one phone or email at three a day', async () => {
    for (let index = 0; index < PER_CONTACT_LIMIT; index += 1) {
      expect((await submitCustomRequest({ ...VISITOR, jewelryType: 'RING' })).ok).toBe(true);
    }

    const fourth = await submitCustomRequest({ ...VISITOR, jewelryType: 'RING' });
    expect(fourth).toEqual({ ok: false, error: 'limit' });
    expect(await testPrisma.customRequest.count()).toBe(PER_CONTACT_LIMIT);

    // The same contact, a day later, is welcome again.
    await testPrisma.customRequest.updateMany({
      data: { createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000) },
    });
    expect((await submitCustomRequest({ ...VISITOR, jewelryType: 'RING' })).ok).toBe(true);
  });

  it('pauses everyone past the hourly ceiling', async () => {
    await testPrisma.customRequest.createMany({
      data: Array.from({ length: SITE_HOURLY_LIMIT }, (_, index) => ({
        fullName: 'x',
        phone: `050${String(index).padStart(7, '0')}`,
        jewelryType: 'RING' as const,
        description: 'בקשה קודמת לבדיקה.',
      })),
    });

    const result = await submitCustomRequest({ ...VISITOR, jewelryType: 'RING' });
    expect(result).toEqual({ ok: false, error: 'busy' });
  });

  it('is held to one way back by the database too', async () => {
    await expect(
      testPrisma.customRequest.create({
        data: { fullName: 'x', jewelryType: 'RING', description: 'בדיקת אילוץ במסד.' },
      }),
    ).rejects.toThrow();
  });
});
