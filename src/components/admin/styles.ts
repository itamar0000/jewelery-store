/**
 * The admin's field styles, in a plain module so server-rendered pages and
 * client forms can both use them. (Constants exported from a 'use client'
 * file reach a server component as a client reference, not as a string.)
 */

export const INPUT =
  'border-input focus:border-accent w-full border bg-transparent px-3 py-2 text-sm transition-colors';

export const LABEL = 'text-sm font-medium';

/** A link that looks like a button, for actions that open somewhere else. */
export const LINK_BUTTON =
  'border-border-field hover:border-accent inline-flex h-12 items-center justify-center gap-2 rounded-full border px-6 text-base font-semibold transition-colors';

/** The WhatsApp link: its own green, so it is found without reading. */
export const WHATSAPP_BUTTON =
  'inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#1f7a4d] px-6 text-base font-semibold text-white transition-colors hover:bg-[#186440]';
