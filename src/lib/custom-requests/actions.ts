'use server';

import { submitCustomRequest, type SubmitRequestResult } from './submit';

/** Save a custom request; the form shows the number, or what to correct. */
export async function submitCustomRequestAction(input: unknown): Promise<SubmitRequestResult> {
  return submitCustomRequest(input);
}
