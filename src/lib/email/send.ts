/**
 * Sending one email, through Resend's HTTP API (https://resend.com/docs/api-reference/emails/send-email).
 *
 * WHY RESEND, AND WHY NO SDK. Its free tier covers a small shop's volume, it
 * needs only DNS records on the shop's own domain, and its API is a single
 * POST - so this is `fetch`, not another dependency. Changing provider means
 * changing this file only: everything else calls `sendEmail`.
 *
 * NEVER THROWS. Email is a courtesy on top of a saved order: a provider outage
 * or a wrong key must not fail a checkout or an admin action. The outcome is
 * returned and logged (without the API key or the message body), and the
 * caller decides nothing on it.
 */

export interface EmailConfig {
  readonly apiKey: string;
  readonly from: string;
  readonly replyTo?: string;
}

export interface EmailMessage {
  readonly to: readonly string[];
  readonly subject: string;
  readonly html: string;
  readonly text: string;
  readonly replyTo?: string;
}

export type SendOutcome = 'sent' | 'skipped' | 'failed';

const RESEND_URL = 'https://api.resend.com/emails';

export async function sendEmail(
  config: EmailConfig | null,
  message: EmailMessage,
  fetchImpl: typeof fetch = fetch,
): Promise<SendOutcome> {
  const to = message.to.map((address) => address.trim()).filter(Boolean);
  if (!config || to.length === 0) return 'skipped';

  try {
    const response = await fetchImpl(RESEND_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: config.from,
        to,
        subject: message.subject,
        html: message.html,
        text: message.text,
        ...((message.replyTo ?? config.replyTo)
          ? { reply_to: message.replyTo ?? config.replyTo }
          : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      console.error(`[email] Resend refused "${message.subject}": HTTP ${response.status}`);
      return 'failed';
    }
    return 'sent';
  } catch (error) {
    console.error(
      `[email] Could not reach Resend for "${message.subject}":`,
      error instanceof Error ? error.name : 'unknown error',
    );
    return 'failed';
  }
}

/** The configuration from the environment's values, or null while email is off. */
export function buildEmailConfig(values: {
  readonly EMAIL_API_KEY?: string;
  readonly EMAIL_FROM?: string;
  readonly EMAIL_REPLY_TO?: string;
  readonly CONTACT_EMAIL?: string;
}): EmailConfig | null {
  if (!values.EMAIL_API_KEY || !values.EMAIL_FROM) return null;
  const replyTo = values.EMAIL_REPLY_TO ?? values.CONTACT_EMAIL;
  return {
    apiKey: values.EMAIL_API_KEY,
    from: values.EMAIL_FROM,
    ...(replyTo ? { replyTo } : {}),
  };
}

/** "a@x.com, b@y.com" -> ["a@x.com", "b@y.com"]. */
export function splitAddresses(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}
