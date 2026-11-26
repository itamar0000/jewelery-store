import { describe, expect, it, vi } from 'vitest';

import { buildEmailConfig, sendEmail, splitAddresses } from './send';
import {
  customerOrderConfirmedEmail,
  customerOrderShippedEmail,
  customerRequestReceivedEmail,
  esc,
  ownerNewOrderEmail,
  ownerNewRequestEmail,
  type OrderEmailData,
} from './templates';

const ORDER: OrderEmailData = {
  orderNumber: 100012,
  customerName: 'דנה <script>alert(1)</script>',
  email: 'dana@example.test',
  phone: '050-7654321',
  totalAgorot: 480000,
  lines: [
    {
      productNameHe: 'טבעת סוליטר',
      variantLabelHe: 'זהב לבן 14K',
      quantity: 1,
      lineTotalAgorot: 480000,
      prepDays: 10,
      details: [{ label: 'חריטה', value: 'D & A <3' }],
    },
  ],
  address: { fullName: 'דנה לוי', street: 'הרצל', houseNumber: '3', apartment: '4', city: 'חיפה' },
};

const CONFIG = { apiKey: 're_test', from: 'Shop <orders@shop.test>', replyTo: 'hello@shop.test' };

describe('email templates', () => {
  it('escapes everything a customer typed', () => {
    const { html } = customerOrderConfirmedEmail(ORDER);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('D &amp; A &lt;3');
    expect(esc(`"'`)).toBe('&quot;&#39;');
  });

  it('tells the shop whether the order is paid, and what to do if not', () => {
    const unpaid = ownerNewOrderEmail(ORDER, {
      paid: false,
      adminUrl: 'https://shop.test/admin/orders/100012',
    });
    expect(unpaid.subject).toContain('ממתינה לתשלום');
    expect(unpaid.text).toContain('התקבל תשלום');
    expect(unpaid.html).toContain('https://shop.test/admin/orders/100012');

    const paid = ownerNewOrderEmail(ORDER, { paid: true, adminUrl: 'https://shop.test/x' });
    expect(paid.subject).toContain('שולמה');
  });

  it('gives the customer the order, the lead time and the address', () => {
    const email = customerOrderConfirmedEmail(ORDER);
    expect(email.subject).toContain('100012');
    expect(email.text).toContain('10 ימי עסקים');
    expect(email.text).toContain('הרצל 3, דירה 4, חיפה');
    expect(email.html).toContain('dir="rtl"');
  });

  it('includes the tracking number on shipping, and omits the line without one', () => {
    expect(customerOrderShippedEmail({ ...ORDER, trackingNumber: 'RR1IL' }).text).toContain(
      'RR1IL',
    );
    expect(customerOrderShippedEmail(ORDER).text).not.toContain('מספר מעקב');
  });

  it('writes both request emails', () => {
    const request = {
      requestNumber: 500003,
      fullName: 'יוסי',
      phone: '052-1111111',
      email: null,
      jewelryTypeLabel: 'טבעת',
      modelName: 'טבעת סוליטר',
      description: 'משהו <b>מיוחד</b>',
    };
    const owner = ownerNewRequestEmail(request, {
      adminUrl: 'https://shop.test/admin/requests/500003',
    });
    expect(owner.subject).toContain('500003');
    expect(owner.html).toContain('&lt;b&gt;');
    expect(owner.text).toContain('לפי טבעת סוליטר');
    expect(customerRequestReceivedEmail(request).subject).toContain('500003');
  });
});

describe('sendEmail', () => {
  it('sends nothing and calls nobody while email is not configured', async () => {
    const fetchImpl = vi.fn();
    expect(
      await sendEmail(null, { to: ['a@b.test'], subject: 's', html: 'h', text: 't' }, fetchImpl),
    ).toBe('skipped');
    expect(await sendEmail(CONFIG, { to: [], subject: 's', html: 'h', text: 't' }, fetchImpl)).toBe(
      'skipped',
    );
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('posts the message to Resend with the key and the reply-to address', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    const outcome = await sendEmail(
      CONFIG,
      { to: ['dana@example.test'], subject: 'נושא', html: '<p>x</p>', text: 'x' },
      fetchImpl,
    );
    expect(outcome).toBe('sent');
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer re_test');
    expect(JSON.parse(String(init.body))).toMatchObject({
      from: CONFIG.from,
      to: ['dana@example.test'],
      subject: 'נושא',
      reply_to: 'hello@shop.test',
    });
  });

  it('reports a refusal or an outage instead of throwing', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const refused = vi.fn().mockResolvedValue(new Response('bad', { status: 422 }));
    const down = vi.fn().mockRejectedValue(new TypeError('fetch failed'));
    const message = { to: ['a@b.test'], subject: 's', html: 'h', text: 't' };
    expect(await sendEmail(CONFIG, message, refused)).toBe('failed');
    expect(await sendEmail(CONFIG, message, down)).toBe('failed');
    // The key never reaches the log.
    expect(JSON.stringify(error.mock.calls)).not.toContain('re_test');
    error.mockRestore();
  });
});

describe('configuration', () => {
  it('is off until both a key and a sender are set, and falls back to the contact email for replies', () => {
    expect(buildEmailConfig({ EMAIL_API_KEY: 're_x' })).toBeNull();
    expect(
      buildEmailConfig({
        EMAIL_API_KEY: 're_x',
        EMAIL_FROM: 'a@b.test',
        CONTACT_EMAIL: 'c@d.test',
      }),
    ).toEqual({ apiKey: 're_x', from: 'a@b.test', replyTo: 'c@d.test' });
  });

  it('splits a list of addresses', () => {
    expect(splitAddresses(' a@b.test, c@d.test ,')).toEqual(['a@b.test', 'c@d.test']);
    expect(splitAddresses(undefined)).toEqual([]);
  });
});
