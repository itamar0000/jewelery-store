/**
 * Contact channels, built from configuration and nothing else.
 *
 * PRODUCT.md: no contact channel is live yet, and "a site that invites a
 * conversation it cannot receive is worse than one that does not invite it."
 * So the storefront asks this module what exists and renders exactly that: an
 * empty list means no nav item, no footer column, no "questions?" prompt and no
 * /contact page. Nothing here supplies a value of its own - every number and
 * address comes from the CONTACT_* environment variables.
 *
 * Pure, so it is tested without an environment; `./index.ts` binds it to the
 * validated environment for the server.
 */

export type ContactChannelId = 'whatsapp' | 'phone' | 'email';

export interface ContactChannel {
  readonly id: ContactChannelId;
  /** What the channel is called, in Hebrew. */
  readonly label: string;
  /** The number or address as a person reads it. Latin/digits: render in `<bdi>`. */
  readonly display: string;
  /** A working link: `https://wa.me/...`, `tel:...` or `mailto:...`. */
  readonly href: string;
}

export interface ContactConfig {
  readonly whatsapp?: string;
  readonly phone?: string;
  readonly email?: string;
}

/**
 * An Israeli number given internationally (972 + 9 digits) reads locally as
 * 05X-XXX-XXXX; anything else is shown in international form. Presentation
 * only - the link always uses the digits as configured.
 */
function displayWhatsApp(digits: string): string {
  if (digits.startsWith('972') && digits.length === 12) {
    const local = `0${digits.slice(3)}`;
    return `${local.slice(0, 3)}-${local.slice(3, 6)}-${local.slice(6)}`;
  }
  return `+${digits}`;
}

/** The configured channels, in the order the site offers them. */
export function buildContactChannels(config: ContactConfig): readonly ContactChannel[] {
  const channels: ContactChannel[] = [];

  if (config.whatsapp) {
    const digits = config.whatsapp.replace(/\D/g, '');
    channels.push({
      id: 'whatsapp',
      label: 'וואטסאפ',
      display: displayWhatsApp(digits),
      href: `https://wa.me/${digits}`,
    });
  }

  if (config.phone) {
    const dial = config.phone.trim().startsWith('+')
      ? `+${config.phone.replace(/\D/g, '')}`
      : config.phone.replace(/\D/g, '');
    channels.push({
      id: 'phone',
      label: 'טלפון',
      display: config.phone.trim(),
      href: `tel:${dial}`,
    });
  }

  if (config.email) {
    const address = config.email.trim();
    channels.push({ id: 'email', label: 'דוא״ל', display: address, href: `mailto:${address}` });
  }

  return channels;
}
