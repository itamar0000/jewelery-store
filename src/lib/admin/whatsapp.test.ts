import { describe, expect, it } from 'vitest';

import { orderWhatsAppMessage, toWhatsAppNumber, whatsAppLink } from './whatsapp';

describe('toWhatsAppNumber', () => {
  it('turns an Israeli number however typed into international digits', () => {
    expect(toWhatsAppNumber('050-765 4321')).toBe('972507654321');
    expect(toWhatsAppNumber('+972 50 765 4321')).toBe('972507654321');
    expect(toWhatsAppNumber('972507654321')).toBe('972507654321');
  });

  it('gives nothing for a number too short to be real', () => {
    expect(toWhatsAppNumber('1234')).toBeNull();
    expect(toWhatsAppNumber(null)).toBeNull();
  });
});

describe('whatsAppLink', () => {
  it('opens the chat with the message filled in', () => {
    const link = whatsAppLink('050-7654321', 'שלום דנה');
    expect(link).toBe(`https://wa.me/972507654321?text=${encodeURIComponent('שלום דנה')}`);
  });
});

describe('orderWhatsAppMessage', () => {
  const base = { orderNumber: 100012, customerName: 'דנה לוי', totalAgorot: 480000 };

  it('greets by first name and fits the stage', () => {
    const unpaid = orderWhatsAppMessage({ ...base, status: 'PENDING_PAYMENT' });
    expect(unpaid).toContain('שלום דנה,');
    expect(unpaid).toContain('100012');
    expect(unpaid).toContain('קישור לתשלום');

    expect(orderWhatsAppMessage({ ...base, status: 'PROCESSING' })).toContain('בהכנה');
  });

  it('carries the tracking number once shipped', () => {
    expect(
      orderWhatsAppMessage({ ...base, status: 'SHIPPED', trackingNumber: 'RR123IL' }),
    ).toContain('RR123IL');
  });
});
