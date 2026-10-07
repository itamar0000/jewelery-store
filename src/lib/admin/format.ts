import { formatPrice, fromAgorot } from '@/lib/money';

/** Dates in the workshop's own time zone, whatever the server's is. */
const DATE_TIME = new Intl.DateTimeFormat('he-IL', {
  timeZone: 'Asia/Jerusalem',
  day: 'numeric',
  month: 'numeric',
  year: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

const DATE = new Intl.DateTimeFormat('he-IL', {
  timeZone: 'Asia/Jerusalem',
  day: 'numeric',
  month: 'numeric',
  year: 'numeric',
});

export function formatDateTime(date: Date): string {
  return DATE_TIME.format(date);
}

export function formatDate(date: Date): string {
  return DATE.format(date);
}

export function formatAgorot(agorot: number): string {
  return formatPrice(fromAgorot(agorot));
}
