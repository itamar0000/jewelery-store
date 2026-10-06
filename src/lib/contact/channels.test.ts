import { describe, expect, it } from 'vitest';

import { buildContactChannels } from './channels';

describe('buildContactChannels', () => {
  it('offers nothing when nothing is configured', () => {
    expect(buildContactChannels({})).toEqual([]);
  });

  it('builds a WhatsApp link from the digits, whatever the formatting', () => {
    const [channel] = buildContactChannels({ whatsapp: '+972 50-123-4567' });

    expect(channel?.href).toBe('https://wa.me/972501234567');
    expect(channel?.display).toBe('050-123-4567');
  });

  it('shows a non-Israeli WhatsApp number in international form', () => {
    expect(buildContactChannels({ whatsapp: '447700900123' })[0]?.display).toBe('+447700900123');
  });

  it('shows a phone number as written and dials its digits', () => {
    const [channel] = buildContactChannels({ phone: '03-1234567' });

    expect(channel?.display).toBe('03-1234567');
    expect(channel?.href).toBe('tel:031234567');
  });

  it('keeps the + of an international phone number in the dial string', () => {
    expect(buildContactChannels({ phone: '+972 3-1234567' })[0]?.href).toBe('tel:+97231234567');
  });

  it('links an email address', () => {
    expect(buildContactChannels({ email: 'hello@example.com' })[0]?.href).toBe(
      'mailto:hello@example.com',
    );
  });

  it('offers channels in a fixed order: WhatsApp, phone, email', () => {
    const ids = buildContactChannels({
      email: 'hello@example.com',
      phone: '03-1234567',
      whatsapp: '972501234567',
    }).map((channel) => channel.id);

    expect(ids).toEqual(['whatsapp', 'phone', 'email']);
  });
});
