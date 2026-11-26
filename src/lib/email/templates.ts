import { SITE_NAME } from '@/lib/config/site';
import { formatPrice, fromAgorot } from '@/lib/money';

/**
 * The shop's emails, as plain data in and { subject, html, text } out.
 *
 * Pure, so every message is tested without a provider. Hebrew, right to left,
 * one column, no images: they read the same in Gmail, Outlook and a phone's
 * mail app, and nothing in them can break when a stylesheet is stripped.
 *
 * EVERYTHING A CUSTOMER TYPED IS ESCAPED. Names, addresses, engraving text
 * and request descriptions are strangers' input; `esc` runs on all of them
 * before they reach the HTML.
 */

export interface EmailContent {
  readonly subject: string;
  readonly html: string;
  readonly text: string;
}

export interface OrderEmailData {
  readonly orderNumber: number;
  readonly customerName: string;
  readonly email: string;
  readonly phone: string;
  readonly totalAgorot: number;
  readonly lines: readonly {
    readonly productNameHe: string;
    readonly variantLabelHe: string;
    readonly quantity: number;
    readonly lineTotalAgorot: number;
    readonly prepDays: number | null;
    readonly details: readonly { readonly label: string; readonly value: string }[];
  }[];
  readonly address: {
    readonly fullName: string;
    readonly street: string;
    readonly houseNumber: string;
    readonly apartment: string | null;
    readonly city: string;
  } | null;
  readonly trackingNumber?: string | null;
}

export interface RequestEmailData {
  readonly requestNumber: number;
  readonly fullName: string;
  readonly phone: string | null;
  readonly email: string | null;
  readonly jewelryTypeLabel: string;
  readonly modelName: string | null;
  readonly description: string;
}

export function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const money = (agorot: number) => formatPrice(fromAgorot(agorot));

function layout(title: string, body: string): string {
  return `<!doctype html>
<html lang="he" dir="rtl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:#f6f3ee;">
<div dir="rtl" style="max-width:560px;margin:0 auto;padding:24px 20px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#1f1d1a;text-align:right;">
<p style="font-size:20px;font-weight:bold;margin:0 0 20px;">${esc(SITE_NAME)}</p>
<div style="background:#ffffff;padding:24px;border:1px solid #e6e0d6;">
${body}
</div>
</div>
</body>
</html>`;
}

function addressLine(address: NonNullable<OrderEmailData['address']>): string {
  return `${address.street} ${address.houseNumber}${address.apartment ? `, דירה ${address.apartment}` : ''}, ${address.city}`;
}

function linesHtml(order: OrderEmailData): string {
  const rows = order.lines
    .map((line) => {
      const details = line.details
        .map(
          (detail) =>
            `<br><span style="color:#6b655c;">${esc(detail.label)}: ${esc(detail.value)}</span>`,
        )
        .join('');
      return `<tr>
<td style="padding:10px 0;border-bottom:1px solid #eee;vertical-align:top;"><strong>${esc(line.productNameHe)}</strong><br><span style="color:#6b655c;">${esc(line.variantLabelHe)}</span>${details}</td>
<td style="padding:10px 0;border-bottom:1px solid #eee;vertical-align:top;text-align:left;white-space:nowrap;">× ${line.quantity}<br>${esc(money(line.lineTotalAgorot))}</td>
</tr>`;
    })
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:16px 0;">${rows}
<tr><td style="padding:12px 0;font-weight:bold;">סה״כ</td><td style="padding:12px 0;font-weight:bold;text-align:left;white-space:nowrap;">${esc(money(order.totalAgorot))}</td></tr>
</table>`;
}

function linesText(order: OrderEmailData): string {
  return order.lines
    .map((line) => {
      const details = line.details
        .map((detail) => `   ${detail.label}: ${detail.value}`)
        .join('\n');
      return `- ${line.productNameHe} (${line.variantLabelHe}) × ${line.quantity} — ${money(line.lineTotalAgorot)}${details ? `\n${details}` : ''}`;
    })
    .join('\n');
}

function button(href: string, label: string): string {
  return `<p style="margin:24px 0 0;"><a href="${esc(href)}" style="display:inline-block;background:#1f3a2e;color:#ffffff;text-decoration:none;padding:12px 22px;font-weight:bold;">${esc(label)}</a></p>`;
}

/** Longest preparation time on the order, in business days. */
function longestPrep(order: OrderEmailData): number | null {
  const days = order.lines.map((line) => line.prepDays ?? 0);
  const max = Math.max(0, ...days);
  return max > 0 ? max : null;
}

/** To the shop: a new order. `paid` false means payment must be arranged by hand. */
export function ownerNewOrderEmail(
  order: OrderEmailData,
  options: { readonly paid: boolean; readonly adminUrl: string },
): EmailContent {
  const status = options.paid ? 'שולמה' : 'ממתינה לתשלום';
  const subject = `הזמנה חדשה ${order.orderNumber} · ${money(order.totalAgorot)} · ${status}`;
  const todo = options.paid
    ? 'התשלום התקבל. אפשר להתחיל להכין.'
    : 'התשלום עוד לא התקבל. צרו קשר עם הלקוח כדי לסדר תשלום, ואחרי שהכסף התקבל לחצו באתר הניהול על "התקבל תשלום".';
  const html = layout(
    subject,
    `<h1 style="font-size:20px;margin:0 0 8px;">הזמנה חדשה ${order.orderNumber}</h1>
<p style="margin:0 0 16px;"><strong>${esc(todo)}</strong></p>
<p style="margin:0;">${esc(order.customerName)}<br><span dir="ltr">${esc(order.phone)}</span><br><span dir="ltr">${esc(order.email)}</span></p>
${order.address ? `<p style="margin:12px 0 0;">משלוח אל: ${esc(order.address.fullName)}, ${esc(addressLine(order.address))}</p>` : ''}
${linesHtml(order)}
${button(options.adminUrl, 'לפתיחת ההזמנה')}`,
  );
  const text = [
    `הזמנה חדשה ${order.orderNumber} (${status})`,
    todo,
    '',
    `${order.customerName} · ${order.phone} · ${order.email}`,
    order.address ? `משלוח אל: ${order.address.fullName}, ${addressLine(order.address)}` : '',
    '',
    linesText(order),
    `סה״כ: ${money(order.totalAgorot)}`,
    '',
    `לפתיחת ההזמנה: ${options.adminUrl}`,
  ].join('\n');
  return { subject, html, text };
}

/** To the customer: payment received, the order is in hand. */
export function customerOrderConfirmedEmail(order: OrderEmailData): EmailContent {
  const subject = `קיבלנו את ההזמנה שלך (${order.orderNumber})`;
  const prep = longestPrep(order);
  const prepLine = prep
    ? `אנחנו מכינים את התכשיט במיוחד עבורך. זמן ההכנה עד ${prep} ימי עסקים, ונעדכן כשההזמנה יוצאת למשלוח.`
    : 'נעדכן כשההזמנה יוצאת למשלוח.';
  const html = layout(
    subject,
    `<h1 style="font-size:20px;margin:0 0 8px;">תודה, ${esc(order.customerName)}!</h1>
<p style="margin:0 0 8px;">התשלום התקבל וההזמנה <strong>${order.orderNumber}</strong> בטיפול.</p>
<p style="margin:0;">${esc(prepLine)}</p>
${linesHtml(order)}
${order.address ? `<p style="margin:0;">המשלוח יגיע אל: ${esc(order.address.fullName)}, ${esc(addressLine(order.address))}</p>` : ''}
<p style="margin:16px 0 0;color:#6b655c;">לכל שאלה אפשר להשיב למייל הזה ולציין את מספר ההזמנה.</p>`,
  );
  const text = [
    `תודה, ${order.customerName}!`,
    `התשלום התקבל וההזמנה ${order.orderNumber} בטיפול.`,
    prepLine,
    '',
    linesText(order),
    `סה״כ: ${money(order.totalAgorot)}`,
    order.address
      ? `\nהמשלוח יגיע אל: ${order.address.fullName}, ${addressLine(order.address)}`
      : '',
    '',
    'לכל שאלה אפשר להשיב למייל הזה ולציין את מספר ההזמנה.',
  ].join('\n');
  return { subject, html, text };
}

/** To the customer: the parcel has left. */
export function customerOrderShippedEmail(order: OrderEmailData): EmailContent {
  const subject = `ההזמנה שלך יצאה למשלוח (${order.orderNumber})`;
  const tracking = order.trackingNumber?.trim();
  const html = layout(
    subject,
    `<h1 style="font-size:20px;margin:0 0 8px;">ההזמנה בדרך אליך</h1>
<p style="margin:0;">שלום ${esc(order.customerName)}, ההזמנה <strong>${order.orderNumber}</strong> יצאה למשלוח.</p>
${tracking ? `<p style="margin:12px 0 0;">מספר מעקב: <strong dir="ltr">${esc(tracking)}</strong></p>` : ''}
${order.address ? `<p style="margin:12px 0 0;">אל: ${esc(order.address.fullName)}, ${esc(addressLine(order.address))}</p>` : ''}
<p style="margin:16px 0 0;color:#6b655c;">לכל שאלה אפשר להשיב למייל הזה.</p>`,
  );
  const text = [
    `שלום ${order.customerName}, ההזמנה ${order.orderNumber} יצאה למשלוח.`,
    ...(tracking ? [`מספר מעקב: ${tracking}`] : []),
    ...(order.address ? [`אל: ${order.address.fullName}, ${addressLine(order.address)}`] : []),
    '',
    'לכל שאלה אפשר להשיב למייל הזה.',
  ].join('\n');
  return { subject, html, text };
}

/** To the shop: a new custom-design request. */
export function ownerNewRequestEmail(
  request: RequestEmailData,
  options: { readonly adminUrl: string },
): EmailContent {
  const subject = `בקשת עיצוב חדשה #${request.requestNumber} · ${request.fullName}`;
  const what = request.modelName
    ? `${request.jewelryTypeLabel}, לפי ${request.modelName}`
    : request.jewelryTypeLabel;
  const contact = [request.phone, request.email].filter(Boolean) as string[];
  const html = layout(
    subject,
    `<h1 style="font-size:20px;margin:0 0 8px;">בקשת עיצוב חדשה #${request.requestNumber}</h1>
<p style="margin:0;"><strong>${esc(request.fullName)}</strong>${contact.map((value) => `<br><span dir="ltr">${esc(value)}</span>`).join('')}</p>
<p style="margin:12px 0 0;">${esc(what)}</p>
<p style="margin:12px 0 0;background:#f6f3ee;padding:12px;white-space:pre-line;">${esc(request.description)}</p>
${button(options.adminUrl, 'לפתיחת הבקשה')}`,
  );
  const text = [
    `בקשת עיצוב חדשה #${request.requestNumber}`,
    `${request.fullName}${contact.length ? ` · ${contact.join(' · ')}` : ''}`,
    what,
    '',
    request.description,
    '',
    `לפתיחת הבקשה: ${options.adminUrl}`,
  ].join('\n');
  return { subject, html, text };
}

/** To the customer, when they left an email: the request arrived. */
export function customerRequestReceivedEmail(request: RequestEmailData): EmailContent {
  const subject = `קיבלנו את בקשת העיצוב שלך (#${request.requestNumber})`;
  const html = layout(
    subject,
    `<h1 style="font-size:20px;margin:0 0 8px;">תודה, ${esc(request.fullName)}!</h1>
<p style="margin:0;">קיבלנו את הבקשה שלך, מספר <strong>${request.requestNumber}</strong>. נחזור אליך עם הצעה בהקדם.</p>
<p style="margin:12px 0 0;background:#f6f3ee;padding:12px;white-space:pre-line;">${esc(request.description)}</p>`,
  );
  const text = [
    `תודה, ${request.fullName}!`,
    `קיבלנו את הבקשה שלך, מספר ${request.requestNumber}. נחזור אליך עם הצעה בהקדם.`,
    '',
    request.description,
  ].join('\n');
  return { subject, html, text };
}
