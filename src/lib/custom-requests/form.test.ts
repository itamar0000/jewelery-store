import { describe, expect, it } from 'vitest';

import {
  EMPTY_REQUEST,
  changeAreaLabel,
  requestMessage,
  toRequestPayload,
  validateRequest,
} from './form';

const filled = {
  ...EMPTY_REQUEST,
  description: 'אותה טבעת בזהב אדום.',
  fullName: 'מיכל',
  phone: '050-1234567',
};

describe('custom request form', () => {
  it('accepts a phone without an email, and an email without a phone', () => {
    expect(validateRequest(filled, true)).toEqual({});
    expect(validateRequest({ ...filled, phone: '', email: 'a@b.co' }, true)).toEqual({});
  });

  it('asks for one way back, on the phone field', () => {
    expect(validateRequest({ ...filled, phone: '' }, true)).toEqual({ phone: 'contact' });
    expect(requestMessage('phone', 'contact')).toContain('טלפון או אימייל');
  });

  it('asks for the kind of jewellery only without a model', () => {
    expect(validateRequest(filled, false)).toEqual({ jewelryType: 'missing' });
    expect(validateRequest({ ...filled, jewelryType: 'RING' }, false)).toEqual({});
  });

  it('wants a description of some substance', () => {
    expect(validateRequest({ ...filled, description: 'קצר' }, true)).toEqual({
      description: 'short',
    });
  });

  it('checks a phone and an email that are given', () => {
    expect(validateRequest({ ...filled, phone: '123' }, true)).toEqual({ phone: 'invalid' });
    expect(validateRequest({ ...filled, email: 'not-an-email' }, true)).toEqual({
      email: 'invalid',
    });
  });

  it('names the size of a ring and the length of a chain', () => {
    expect(changeAreaLabel('size', 'RING')).toBe('מידה');
    expect(changeAreaLabel('size', 'NECKLACE')).toBe('אורך');
  });

  it('sends the model by slug and the words trimmed, with no price', () => {
    const payload = toRequestPayload(
      { ...filled, email: '  ', changeAreas: ['stone'] },
      { slug: 'aurora-ring', choices: { karat: '18k' } },
    );
    expect(payload).toEqual({
      jewelryType: null,
      productSlug: 'aurora-ring',
      choices: { karat: '18k' },
      changeAreas: ['stone'],
      description: 'אותה טבעת בזהב אדום.',
      fullName: 'מיכל',
      phone: '050-1234567',
      email: null,
    });
  });
});
