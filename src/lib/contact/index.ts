import { env } from '@/lib/env';

import { buildContactChannels } from './channels';

/**
 * The channels this deployment actually has. SERVER ONLY: it reads the
 * validated environment, so client components receive what they need as props.
 */
export const contactChannels = buildContactChannels({
  whatsapp: env.CONTACT_WHATSAPP,
  phone: env.CONTACT_PHONE,
  email: env.CONTACT_EMAIL,
});

/** Whether the site may invite a visitor to get in touch at all. */
export const contactAvailable = contactChannels.length > 0;

export { buildContactChannels, type ContactChannel } from './channels';
