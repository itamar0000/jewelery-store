import { prisma } from '@/lib/db';
import { requireMediaStorage, type ImageContentType } from '@/lib/media';

/**
 * A product's photographs, as the owner manages them (D4D.25).
 *
 * GROUPS, NOT ROWS. The owner thinks "the yellow-gold photographs" and "the
 * photographs for every colour"; the catalogue stores one `ProductImage` row
 * per variant (spec principle 3). So a group is either a gold colour - every
 * live variant in that colour gets the row, the same object in storage - or
 * ALL, the product-level rows the gallery falls back to and the catalogue
 * card shows. Adding, ordering, labelling and removing act on a whole group.
 *
 * STORAGE OBJECTS ARE NEVER DELETED. An order line keeps the key of the
 * photograph it was sold with (`OrderItem.imageKey`); removing a photograph
 * from the product removes its rows and leaves the object for that history.
 *
 * THE BYTES COME THROUGH THE SERVER, already downscaled in the browser, and
 * are checked here by their first bytes, not by what the browser claims, then
 * put to storage through the same presigned path the placement script uses.
 */

export const ALL_GROUP = 'ALL';

/** Under Vercel's 4.5MB request ceiling, with room for the form around it. */
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

const COLOUR_HE: Readonly<Record<string, string>> = {
  YELLOW: 'זהב צהוב',
  WHITE: 'זהב לבן',
  ROSE: 'זהב אדום',
};

/** The type the file's own first bytes declare, or null when it is not an image we take. */
export function detectImageType(bytes: Uint8Array): ImageContentType | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a
  ) {
    return 'image/png';
  }
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp';
  return null;
}

/** The variants a group's rows belong to; [null] for the product level. */
async function groupSlots(productId: string, group: string): Promise<(string | null)[]> {
  if (group === ALL_GROUP) return [null];
  const variants = await prisma.productVariant.findMany({
    where: {
      productId,
      archivedAt: null,
      optionValues: { some: { value: { value: group, option: { code: 'gold_color' } } } },
    },
    select: { id: true },
  });
  return variants.map((variant) => variant.id);
}

function groupWhere(productId: string, slots: (string | null)[]) {
  return slots[0] === null
    ? { productId, variantId: null }
    : { productId, variantId: { in: slots as string[] } };
}

export interface GroupImage {
  readonly storageKey: string;
  readonly isSimulation: boolean;
  readonly position: number;
}

/** The group's photographs in order, one entry per photograph (not per row). */
async function groupImages(productId: string, slots: (string | null)[]): Promise<GroupImage[]> {
  if (slots.length === 0) return [];
  const rows = await prisma.productImage.findMany({
    where: groupWhere(productId, slots),
    orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    select: { storageKey: true, isSimulation: true, position: true },
  });
  const seen = new Map<string, GroupImage>();
  for (const row of rows) if (!seen.has(row.storageKey)) seen.set(row.storageKey, row);
  return [...seen.values()];
}

export interface ImageGroup {
  readonly key: string;
  readonly labelHe: string;
  readonly images: readonly GroupImage[];
}

/** Every group of a product: one per gold colour it is offered in, then ALL. */
export async function listImageGroups(productId: string): Promise<ImageGroup[]> {
  const colours = await prisma.productOptionValue.findMany({
    where: { isActive: true, option: { productId, code: 'gold_color' } },
    orderBy: { position: 'asc' },
    select: { value: true, labelHe: true },
  });
  const groups: ImageGroup[] = [];
  for (const colour of colours) {
    const slots = await groupSlots(productId, colour.value);
    if (slots.length === 0) continue;
    groups.push({
      key: colour.value,
      labelHe: colour.labelHe,
      images: await groupImages(productId, slots),
    });
  }
  groups.push({
    key: ALL_GROUP,
    labelHe: colours.length > 0 ? 'לכל הגוונים' : 'תמונות המוצר',
    images: await groupImages(productId, [null]),
  });
  return groups;
}

/** Rewrites a group's positions in the given order; the first is primary. */
async function writeOrder(productId: string, slots: (string | null)[], keys: readonly string[]) {
  await prisma.$transaction(
    keys.map((storageKey, index) =>
      prisma.productImage.updateMany({
        where: { ...groupWhere(productId, slots), storageKey },
        data: { position: index + 1, isPrimary: index === 0 },
      }),
    ),
  );
}

export type UploadResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: 'type' | 'size' | 'group' | 'storage' | 'upload' };

export async function addProductImage(input: {
  readonly productId: string;
  readonly group: string;
  readonly bytes: Uint8Array;
  readonly simulated: boolean;
  readonly width: number | null;
  readonly height: number | null;
}): Promise<UploadResult> {
  if (input.bytes.length > MAX_IMAGE_BYTES || input.bytes.length < 64) {
    return { ok: false, reason: 'size' };
  }
  const contentType = detectImageType(input.bytes);
  if (!contentType) return { ok: false, reason: 'type' };

  const product = await prisma.product.findUnique({
    where: { id: input.productId },
    select: { id: true, slug: true, nameHe: true },
  });
  if (!product) return { ok: false, reason: 'group' };
  const slots = await groupSlots(product.id, input.group);
  if (slots.length === 0) return { ok: false, reason: 'group' };

  let storage;
  try {
    storage = requireMediaStorage();
  } catch {
    return { ok: false, reason: 'storage' };
  }
  const target = await storage.createUpload({
    contentType,
    bytes: input.bytes.length,
    originalFilename: `${product.slug}-${input.group.toLowerCase()}`,
    productId: product.id,
    visibility: 'public',
  });
  const put = await fetch(target.url, {
    method: 'PUT',
    body: new Blob([new Uint8Array(input.bytes)]),
    headers: target.headers,
  });
  if (!put.ok) return { ok: false, reason: 'upload' };

  const existing = await groupImages(product.id, slots);
  const position = existing.length + 1;
  const colourHe = COLOUR_HE[input.group];
  const altHe =
    `${product.nameHe}${colourHe ? `, ${colourHe}` : ''}` + (input.simulated ? ' (הדמיה)' : '');

  await prisma.productImage.createMany({
    data: slots.map((variantId) => ({
      productId: product.id,
      variantId,
      storageKey: target.key,
      altHe,
      width: input.width,
      height: input.height,
      position,
      isPrimary: position === 1,
      isSimulation: input.simulated,
    })),
  });
  return { ok: true };
}

export async function moveProductImage(
  productId: string,
  group: string,
  storageKey: string,
  direction: 'earlier' | 'later',
): Promise<void> {
  const slots = await groupSlots(productId, group);
  const keys = (await groupImages(productId, slots)).map((image) => image.storageKey);
  const index = keys.indexOf(storageKey);
  const swap = direction === 'earlier' ? index - 1 : index + 1;
  if (index < 0 || swap < 0 || swap >= keys.length) return;
  [keys[index], keys[swap]] = [keys[swap]!, keys[index]!];
  await writeOrder(productId, slots, keys);
}

export async function setImageSimulation(
  productId: string,
  group: string,
  storageKey: string,
  simulated: boolean,
): Promise<void> {
  const slots = await groupSlots(productId, group);
  const rows = await prisma.productImage.findMany({
    where: { ...groupWhere(productId, slots), storageKey },
    select: { id: true, altHe: true },
  });
  for (const row of rows) {
    const base = row.altHe.replace(/ \(הדמיה\)$/, '');
    await prisma.productImage.update({
      where: { id: row.id },
      data: { isSimulation: simulated, altHe: simulated ? `${base} (הדמיה)` : base },
    });
  }
}

export async function removeProductImage(
  productId: string,
  group: string,
  storageKey: string,
): Promise<void> {
  const slots = await groupSlots(productId, group);
  await prisma.productImage.deleteMany({ where: { ...groupWhere(productId, slots), storageKey } });
  const keys = (await groupImages(productId, slots)).map((image) => image.storageKey);
  await writeOrder(productId, slots, keys);
}

export async function countProductImages(productId: string): Promise<number> {
  return prisma.productImage.count({ where: { productId } });
}
