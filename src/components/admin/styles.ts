/**
 * The admin's field styles, in a plain module so server-rendered pages and
 * client forms can both use them. (Constants exported from a 'use client'
 * file reach a server component as a client reference, not as a string.)
 */

export const INPUT =
  'border-input focus:border-accent w-full border bg-transparent px-3 py-2 text-sm transition-colors';

export const LABEL = 'text-sm font-medium';
