import type { Prisma } from '@/generated/prisma/client';
import { choicesFromParams } from '@/lib/catalog/choice-params';
import { activeProduct } from '@/lib/catalog/queries';
import { prisma } from '@/lib/db';
import { customRequestSchema } from '@/lib/validation/commerce';

import {
  CHANGE_AREAS,
  EMPTY_REQUEST,
  JEWELRY_TYPES,
  validateRequest,
  type ChangeArea,
  type RequestField,
  type RequestProblems,
  type RequestValues,
} from './form';

/**
 * Saving a custom request - the "פנייה" that step one of /custom describes.
 *
 * WHAT HAPPENS. The request is written as NEW, with its first status event, and
 * the visitor is given its number. That is all: no email is sent and nobody is
 * notified, because no email provider is configured. The requests wait in the
 * database for the workshop (`npm run requests:list` prints the new ones), and
 * the confirmation the visitor sees says only what is true - saved, numbered,
 * nothing charged.
 *
 * NOTHING IS TAKEN ON TRUST. A model is named by slug and looked up among the
 * published ones; its choices are matched against its own option values, and
 * an unknown one is dropped rather than stored. What is frozen into
 * `productSnapshot` is therefore the catalogue's own wording at this moment,
 * the way an order line freezes its labels.
 */

export type SubmitRequestResult =
  | { readonly ok: true; readonly requestNumber: number }
  | { readonly ok: false; readonly error: 'invalid'; readonly problems: RequestProblems }
  | { readonly ok: false; readonly error: 'failed' }
  /** Too many from these contact details today, or from everyone this hour. */
  | { readonly ok: false; readonly error: 'limit' | 'busy' };

/**
 * THE CAP (owner decision, D4D.19). Counted in the database, because the site
 * runs on serverless functions with no shared memory to count in:
 *
 *   - PER CONTACT: a phone or an email that has sent PER_CONTACT_LIMIT requests
 *     in the last day waits until tomorrow. A person rarely needs more, and it
 *     stops one visitor from filling the queue.
 *   - SITE-WIDE: past SITE_HOURLY_LIMIT requests in an hour, the form asks
 *     everyone to try again later. Far above any real day's traffic; it exists
 *     so a script varying its details cannot flood the table.
 */
export const PER_CONTACT_LIMIT = 3;
export const SITE_HOURLY_LIMIT = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

/** Filled only by software: a person never sees the field (see RequestForm). */
export const TRAP_FIELD = 'website';

export async function submitCustomRequest(raw: unknown): Promise<SubmitRequestResult> {
  const source = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};

  // A filled trap is an automated submission. It is refused like a failure,
  // without saying why and without writing anything.
  if (typeof source[TRAP_FIELD] === 'string' && source[TRAP_FIELD] !== '') {
    return { ok: false, error: 'failed' };
  }

  const slug = typeof source.productSlug === 'string' ? source.productSlug.trim() : '';
  const model = slug ? await findModel(slug) : null;

  // The same rules the form checked, so the answer maps onto the same fields.
  const values = readValues(source);
  const problems = validateRequest(values, model !== null);
  if (Object.keys(problems).length > 0) return { ok: false, error: 'invalid', problems };

  const parsed = customRequestSchema.safeParse({
    fullName: values.fullName.trim(),
    email: values.email.trim() || null,
    phone: values.phone.trim() || null,
    jewelryType: model ? model.productType : values.jewelryType,
    productSlug: model?.slug ?? null,
    changeAreas: model ? values.changeAreas : [],
    description: values.description.trim(),
  });

  if (!parsed.success) {
    const mapped: RequestProblems = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (isRequestField(field)) mapped[field] = 'invalid';
    }
    return { ok: false, error: 'invalid', problems: mapped };
  }

  const input = parsed.data;
  const choices =
    model && typeof source.choices === 'object' && source.choices !== null
      ? snapshotChoices(model, source.choices as Record<string, string>)
      : [];

  try {
    const now = Date.now();
    const contact = [
      ...(input.phone ? [{ phone: input.phone }] : []),
      ...(input.email ? [{ email: input.email }] : []),
    ];
    const [fromContact, lastHour] = await Promise.all([
      prisma.customRequest.count({
        where: { OR: contact, createdAt: { gte: new Date(now - DAY_MS) } },
      }),
      prisma.customRequest.count({ where: { createdAt: { gte: new Date(now - HOUR_MS) } } }),
    ]);
    if (fromContact >= PER_CONTACT_LIMIT) return { ok: false, error: 'limit' };
    if (lastHour >= SITE_HOURLY_LIMIT) return { ok: false, error: 'busy' };

    const request = await prisma.customRequest.create({
      data: {
        fullName: input.fullName,
        email: input.email ?? null,
        phone: input.phone ?? null,
        jewelryType: input.jewelryType ?? 'OTHER',
        description: input.description,
        productId: model?.id ?? null,
        productSnapshot: model
          ? ({ slug: model.slug, nameHe: model.nameHe, choices } satisfies Prisma.InputJsonValue)
          : undefined,
        changeAreas: input.changeAreas,
        events: { create: { toStatus: 'NEW', note: 'נשלחה מהאתר' } },
      },
      select: { requestNumber: true },
    });

    return { ok: true, requestNumber: request.requestNumber };
  } catch {
    return { ok: false, error: 'failed' };
  }
}

type Model = NonNullable<Awaited<ReturnType<typeof findModel>>>;

function findModel(slug: string) {
  return prisma.product.findFirst({
    where: { slug, ...activeProduct },
    select: {
      id: true,
      slug: true,
      nameHe: true,
      productType: true,
      options: {
        orderBy: { position: 'asc' },
        select: {
          id: true,
          code: true,
          nameHe: true,
          values: {
            where: { isActive: true },
            orderBy: { position: 'asc' },
            select: { id: true, value: true, labelHe: true },
          },
        },
      },
    },
  });
}

/** The model's choices as the catalogue words them, in its option order. */
function snapshotChoices(model: Model, params: Record<string, string>) {
  const clean: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string') clean[key] = value;
  }

  const chosen = choicesFromParams(model.options, clean);
  return model.options.flatMap((option) => {
    const value = option.values.find((candidate) => candidate.id === chosen[option.id]);
    return value ? [{ labelHe: option.nameHe, valueHe: value.labelHe }] : [];
  });
}

function readValues(source: Record<string, unknown>): RequestValues {
  const text = (key: string) => (typeof source[key] === 'string' ? (source[key] as string) : '');
  const type = text('jewelryType');
  const areas = Array.isArray(source.changeAreas) ? source.changeAreas : [];

  return {
    ...EMPTY_REQUEST,
    jewelryType: JEWELRY_TYPES.some((option) => option.value === type)
      ? (type as RequestValues['jewelryType'])
      : '',
    changeAreas: CHANGE_AREAS.filter((area): area is ChangeArea => areas.includes(area)),
    description: text('description'),
    fullName: text('fullName'),
    phone: text('phone'),
    email: text('email'),
  };
}

function isRequestField(value: unknown): value is RequestField {
  return (
    value === 'jewelryType' ||
    value === 'description' ||
    value === 'fullName' ||
    value === 'phone' ||
    value === 'email'
  );
}
