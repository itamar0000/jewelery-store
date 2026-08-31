import { z } from 'zod';

import { MediaValidationError, type ImageContentType, type MediaVisibility } from './provider';

/**
 * Upload validation and safe key construction.
 *
 * THIS RUNS BEFORE ANYTHING IS SIGNED. A presigned URL *is* the authorization,
 * so validating after signing would validate nothing - the caller already holds
 * a usable credential by then.
 */

/**
 * Accepted formats.
 *
 * SVG IS DELIBERATELY ABSENT, and this is a security decision rather than a
 * capability gap. An SVG is executable markup: it can carry `<script>`, and
 * serving one from the asset origin is a stored-XSS vector. Product photography
 * has no need for it.
 *
 * GIF is absent too, for a duller reason - it is a poor format for jewellery
 * stills and `next/image` would re-encode it anyway.
 */
export const ACCEPTED_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
] as const satisfies readonly ImageContentType[];

/**
 * The extension each accepted type maps to.
 *
 * THE EXTENSION COMES FROM THE VALIDATED CONTENT TYPE, never from the uploaded
 * filename. That single choice removes the entire class of bugs where
 * `evil.php.jpg`, `../../etc/passwd` or a right-to-left override character
 * reaches a path.
 */
const EXTENSION_BY_TYPE: Readonly<Record<ImageContentType, string>> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
};

/**
 * Maximum upload size: 12 MB.
 *
 * Comfortably above a high-quality product photograph straight from a camera,
 * and low enough that a mistake or an abusive upload cannot fill a bucket. The
 * cap is enforced when the URL is signed; the storage provider enforces it
 * again through the signed content-length where supported.
 */
export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;

/** Below this, the file is not a real image and is almost certainly an error. */
export const MIN_UPLOAD_BYTES = 64;

export const uploadRequestSchema = z.object({
  contentType: z.enum(ACCEPTED_CONTENT_TYPES, {
    message: `Unsupported image format. Accepted: ${ACCEPTED_CONTENT_TYPES.join(', ')}.`,
  }),
  bytes: z
    .number()
    .int('File size must be a whole number of bytes.')
    .min(MIN_UPLOAD_BYTES, 'File is too small to be an image.')
    .max(MAX_UPLOAD_BYTES, `File exceeds the ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB limit.`),
  /** Untrusted. Used only to pick a readable slug; never becomes a path. */
  originalFilename: z.string().max(255).optional(),
  productId: z.string().max(64).optional(),
  visibility: z.enum(['public', 'private']).optional(),
});

export type UploadRequest = z.infer<typeof uploadRequestSchema>;

/** Parses an upload request, throwing a user-safe error on failure. */
export function parseUploadRequest(input: unknown): UploadRequest {
  const result = uploadRequestSchema.safeParse(input);

  if (!result.success) {
    throw new MediaValidationError(result.error.issues[0]?.message ?? 'Invalid upload request.');
  }

  return result.data;
}

/**
 * Metadata required before an image row may be created.
 *
 * Alt text is REQUIRED, not optional. Accessibility is not negotiable
 * (specification section 47), and the moment to demand a description is while
 * the person uploading is still looking at the picture - a nullable column here
 * becomes a catalog of undescribed images.
 */
export const imageMetadataSchema = z.object({
  storageKey: z.string().min(1).max(512),
  altHe: z
    .string()
    .trim()
    .min(2, 'Alt text is required for every image (accessibility, section 47).')
    .max(300),
  width: z.number().int().positive().max(20_000).optional(),
  height: z.number().int().positive().max(20_000).optional(),
  position: z.number().int().min(0).max(500).default(0),
  isPrimary: z.boolean().default(false),
  variantId: z.string().max(64).nullable().optional(),
});

export type ImageMetadata = z.infer<typeof imageMetadataSchema>;

export function parseImageMetadata(input: unknown): ImageMetadata {
  const result = imageMetadataSchema.safeParse(input);

  if (!result.success) {
    throw new MediaValidationError(result.error.issues[0]?.message ?? 'Invalid image metadata.');
  }

  return result.data;
}

/**
 * A short, safe slug taken from an untrusted filename.
 *
 * Purely cosmetic - it makes the bucket readable to a human. Every dangerous
 * possibility is removed rather than escaped: only lowercase ASCII letters,
 * digits and hyphens survive, so path separators, traversal sequences, control
 * characters, null bytes and Unicode direction overrides cannot reach a key.
 *
 * Returns an empty string when nothing usable remains, and the key simply omits
 * the slug.
 */
export function safeSlug(filename: string | undefined, maxLength = 40): string {
  if (!filename) return '';

  // Drop the extension before slugging: the real extension comes from the
  // validated content type.
  const withoutExtension = filename.replace(/\.[^./\\]*$/, '');

  return withoutExtension
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/g, '');
}

/**
 * Builds the object key.
 *
 * SHAPE: `<visibility>/products/<productId>/<random>-<slug>.<ext>`
 *
 * Three properties matter:
 *   - the RANDOM ID makes the key unguessable and collision-free, so
 *     re-uploading the same filename never overwrites an existing object;
 *   - the EXTENSION is derived from the validated content type, so an
 *     attacker-chosen filename cannot influence how the object is served;
 *   - the VISIBILITY PREFIX separates public catalog imagery from private
 *     customer uploads, which is what a bucket policy keys on.
 */
export function buildStorageKey(input: {
  contentType: ImageContentType;
  originalFilename?: string;
  productId?: string;
  visibility?: MediaVisibility;
  /** Injected in tests for determinism. */
  randomId?: string;
}): string {
  const visibility: MediaVisibility = input.visibility ?? 'public';
  const extension = EXTENSION_BY_TYPE[input.contentType];
  const id = input.randomId ?? crypto.randomUUID();
  const slug = safeSlug(input.originalFilename);

  // The product id is our own cuid, but it is sanitised anyway: defence here
  // costs nothing and the rule "no caller-supplied string reaches a path
  // unsanitised" is easier to keep when it has no exceptions.
  const scope = input.productId
    ? `products/${input.productId.replace(/[^a-zA-Z0-9_-]/g, '')}`
    : 'products/unassigned';

  const name = slug.length > 0 ? `${id}-${slug}` : id;

  return `${visibility}/${scope}/${name}.${extension}`;
}

/** Whether a key belongs to the private namespace. */
export function isPrivateKey(key: string): boolean {
  return key.startsWith('private/');
}
