import type { OrderStatus } from '@/generated/prisma/client';
import { SITE_NAME } from '@/lib/config/site';
import { formatPrice, fromAgorot } from '@/lib/money';

/**
 * WhatsApp links to a customer, with the message already written.
 *
 * The owner presses one button, WhatsApp opens on the customer's chat with a
 * message that fits where the order is, and he edits or sends it. Nothing is
 * sent from here - wa.me only opens the chat.
 */

/** An Israeli number as typed ("050-123 4567", "+972 50...") in wa.me form, or null. */
export function toWhatsAppNumber(phone: string | null | undefined): string | null {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (digits.length < 9) return null;
  if (digits.startsWith('972')) return digits;
  if (digits.startsWith('0')) return `972${digits.slice(1)}`;
  return digits;
}

export function whatsAppLink(phone: string | null | undefined, message: string): string | null {
  const number = toWhatsAppNumber(phone);
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : null;
}

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}

/** The message that fits the order's current stage. */
export function orderWhatsAppMessage(order: {
  readonly orderNumber: number;
  readonly customerName: string;
  readonly status: OrderStatus;
  readonly totalAgorot: number;
  readonly trackingNumber?: string | null;
}): string {
  const hello = `שלום ${firstName(order.customerName)}, כאן ${SITE_NAME}.`;
  const ref = `הזמנה ${order.orderNumber}`;
  switch (order.status) {
    case 'PENDING_PAYMENT':
      return `${hello} תודה על ${ref}! הסכום לתשלום: ${formatPrice(fromAgorot(order.totalAgorot))}. אני שולח לך כאן קישור לתשלום מאובטח.`;
    case 'PAID':
      return `${hello} התשלום עבור ${ref} התקבל, תודה! נעדכן כשהתכשיט יהיה מוכן.`;
    case 'PROCESSING':
      return `${hello} רצינו לעדכן ש${ref} בהכנה אצלנו בסדנה.`;
    case 'READY':
      return `${hello} ${ref} מוכנה ותצא למשלוח בקרוב.`;
    case 'SHIPPED':
      return `${hello} ${ref} יצאה למשלוח.${order.trackingNumber ? ` מספר מעקב: ${order.trackingNumber}` : ''}`;
    case 'DELIVERED':
    case 'COMPLETED':
      return `${hello} מקווים שנהנית מהתכשיט! נשמח לשמוע מה דעתך.`;
    default:
      return `${hello} לגבי ${ref}: `;
  }
}
