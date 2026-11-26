'use server';

import { after } from 'next/server';

import { notifyNewRequest } from '@/lib/email/notify';

import { submitCustomRequest, type SubmitRequestResult } from './submit';

/** Save a custom request; the form shows the number, or what to correct. */
export async function submitCustomRequestAction(input: unknown): Promise<SubmitRequestResult> {
  const result = await submitCustomRequest(input);
  // Told after the visitor has their answer, so a slow provider costs them nothing.
  if (result.ok) after(() => notifyNewRequest(result.requestNumber));
  return result;
}
