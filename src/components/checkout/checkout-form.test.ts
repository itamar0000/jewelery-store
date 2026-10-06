import { describe, expect, it } from 'vitest';

import { checkoutSchema } from '@/lib/validation/commerce';

import {
  EMPTY_VALUES,
  addressLine,
  fieldFromPath,
  fieldMessage,
  readSaved,
  stepFields,
  toPayload,
  validate,
  type CheckoutValues,
} from './checkout-form';

const FILLED: CheckoutValues = {
  ...EMPTY_VALUES,
  customerName: 'מיכל כהן',
  email: 'michal@example.test',
  phone: '050-1234567',
  street: 'הרצל',
  houseNumber: '12',
  city: 'תל אביב',
};

describe('validate', () => {
  it('passes a complete form', () => {
    expect(validate(FILLED, [...stepFields(1, FILLED), ...stepFields(2, FILLED)])).toEqual({});
  });

  it('asks only for what is required, and marks it missing', () => {
    expect(validate(EMPTY_VALUES, stepFields(2, EMPTY_VALUES))).toEqual({
      street: 'missing',
      houseNumber: 'missing',
      city: 'missing',
    });
  });

  it('catches a malformed address, phone and postal code', () => {
    const values = { ...FILLED, email: 'michal@example', phone: '050-12', postalCode: '123' };

    expect(validate(values, ['email', 'phone', 'postalCode'])).toEqual({
      email: 'invalid',
      phone: 'invalid',
      postalCode: 'invalid',
    });
  });

  it('accepts the ways people write Israeli numbers', () => {
    for (const phone of ['0501234567', '050-123-4567', '+972 50 123 4567', '(03) 123-4567']) {
      expect(validate({ ...FILLED, phone }, ['phone'])).toEqual({});
    }
  });

  it('asks for the recipient only when the delivery is for someone else', () => {
    expect(stepFields(2, FILLED)).not.toContain('recipientName');

    const gift = { ...FILLED, forSomeoneElse: true };
    expect(validate(gift, stepFields(2, gift))).toEqual({
      recipientName: 'missing',
      recipientPhone: 'missing',
    });
  });
});

describe('what the server receives', () => {
  it('is the shape the server schema accepts, with no price anywhere', () => {
    const payload = toPayload({
      ...FILLED,
      email: ' michal@example.test ',
      postalCode: '61000 01',
    });

    expect(checkoutSchema.safeParse(payload).success).toBe(true);
    expect(payload.email).toBe('michal@example.test');
    expect(payload.shippingAddress).toMatchObject({ apartment: null, postalCode: '6100001' });
    expect(JSON.stringify(payload)).not.toMatch(/price|agorot|total/i);
  });

  it('sends the buyer as the recipient unless someone else was named', () => {
    expect(toPayload(FILLED).shippingAddress).toMatchObject({
      fullName: 'מיכל כהן',
      phone: '050-1234567',
    });

    const gift = {
      ...FILLED,
      forSomeoneElse: true,
      recipientName: 'נועה לוי',
      recipientPhone: '052-7654321',
    };
    expect(toPayload(gift).shippingAddress).toMatchObject({
      fullName: 'נועה לוי',
      phone: '052-7654321',
    });
  });
});

describe('fieldFromPath', () => {
  it('puts a problem with the delivery name on the field the shopper typed it in', () => {
    expect(fieldFromPath('shippingAddress.fullName', FILLED)).toBe('customerName');
    expect(fieldFromPath('shippingAddress.fullName', { ...FILLED, forSomeoneElse: true })).toBe(
      'recipientName',
    );
    expect(fieldFromPath('shippingAddress.city', FILLED)).toBe('city');
    expect(fieldFromPath('shippingAddress.country', FILLED)).toBeNull();
  });
});

describe('fieldMessage', () => {
  it('names the problem and the way out, in Hebrew', () => {
    expect(fieldMessage('city', 'missing')).toBe('יש להזין עיר או יישוב');
    expect(fieldMessage('email', 'invalid')).toContain('name@example.com');
    expect(fieldMessage('postalCode', 'invalid')).toBe('מיקוד הוא 5 עד 7 ספרות.');
    expect(fieldMessage('instructions', 'invalid')).toBe('אפשר לכתוב כאן עד 500 תווים.');
  });

  it('never speaks in the grammatical gender of a recipient it cannot know', () => {
    expect(fieldMessage('recipientName', 'missing')).toBe('יש להזין שם לקבלת המשלוח');
  });
});

describe('addressLine', () => {
  it('reads as one line, leaving out what was not given', () => {
    expect(addressLine(FILLED)).toBe('הרצל 12, תל אביב');
    expect(addressLine({ ...FILLED, apartment: '4', postalCode: '61000 01' })).toBe(
      'הרצל 12, דירה 4, תל אביב 6100001',
    );
  });
});

describe('readSaved', () => {
  it('restores only the fields the form knows, as text', () => {
    const saved = readSaved(
      JSON.stringify({ customerName: 'מיכל', email: 42, forSomeoneElse: true, price: 1 }),
    );

    expect(saved).toMatchObject({ customerName: 'מיכל', email: '', forSomeoneElse: true });
    expect(saved).not.toHaveProperty('price');
  });

  it('starts empty from nothing, or from something unreadable', () => {
    expect(readSaved(null)).toBeNull();
    expect(readSaved('{not json')).toBeNull();
    expect(readSaved('"a string"')).toBeNull();
  });
});
