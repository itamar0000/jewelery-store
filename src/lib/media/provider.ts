/**
 * The media storage port.
 *
 * ARCHITECTURE section 8 put media behind a provider boundary from the start so
 * the choice would be reversible. This is that boundary, narrowed to what the
 * project actually needs - four operations, not an enterprise abstraction.
 *
 * WHAT IT DELIBERATELY DOES NOT DO:
 *
 *   - It does not transform images. `next/image` derives responsive widths and
 *     modern formats from one canonical URL (docs/MEDIA_STORAGE_DECISION.md),
 *     so a `transform()` on this interface would either duplicate the framework
 *     or lock the schema into one vendor's URL syntax.
 *   - It does not take bytes for public uploads. Files go browser to storage
 *     through a presigned URL; routing them through the Next.js server would
 *     hit serverless body limits for no gain.
 *
 * Keys, never URLs, are what the database stores - so replacing the
 * implementation does not invalidate a single row.
 */

/** Formats accepted for upload. SVG is excluded; see `validation.ts`. */
export type ImageContentType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/avif';

/**
 * Where an object lives.
 *
 * `public` is catalog imagery, served straight from the bucket's public URL.
 * `private` is customer-supplied material - custom-request uploads (§17, §48) -
 * which is business correspondence and must never be publicly listable. The
 * distinction is a key prefix, and it decides whether `publicUrl` is even a
 * legal question to ask.
 */
export type MediaVisibility = 'public' | 'private';

/** A short-lived, single-purpose upload target. */
export interface UploadTarget {
  /** The presigned URL the browser PUTs to. */
  readonly url: string;
  /** The key to record on `ProductImage.storageKey` once the PUT succeeds. */
  readonly key: string;
  /** Headers the browser must send, so the signature matches. */
  readonly headers: Readonly<Record<string, string>>;
  readonly expiresAt: Date;
}

export interface CreateUploadInput {
  /** Validated content type. Determines the key's extension. */
  readonly contentType: ImageContentType;
  /** Declared byte size, checked against the cap before signing. */
  readonly bytes: number;
  /** Untrusted, optional, used only as a hint. Never becomes a path. */
  readonly originalFilename?: string;
  readonly visibility?: MediaVisibility;
  /** Groups an object under a product, purely for legibility in the bucket. */
  readonly productId?: string;
}

export interface MediaStorage {
  /**
   * Issues a presigned upload target.
   *
   * Validation happens HERE, server-side, before anything is signed - the
   * signature is the authorization, so a signed URL for an unchecked
   * content type is an unchecked upload.
   */
  createUpload(input: CreateUploadInput): Promise<UploadTarget>;

  /** Removes an object. Succeeds when the key is already absent. */
  delete(key: string): Promise<void>;

  /**
   * The canonical, cacheable URL for a PUBLIC object.
   *
   * Throws for a private key: a private object has no public URL, and returning
   * one that happens to 403 would be a worse answer than refusing.
   */
  publicUrl(key: string): string;

  /**
   * A short-lived read URL for a PRIVATE object.
   *
   * The only way to serve custom-request uploads to an admin without making the
   * bucket listable.
   */
  signedReadUrl(key: string, expiresInSeconds?: number): Promise<string>;
}

/**
 * Thrown when storage is used but not configured.
 *
 * A distinct type so callers can degrade gracefully - the storefront falls back
 * to the placeholder surface - while an admin upload surfaces the real reason.
 * The message names the missing variables and never contains their values.
 */
export class MediaNotConfiguredError extends Error {
  constructor(missing: readonly string[]) {
    super(
      `Media storage is not configured. Missing: ${missing.join(', ')}. ` +
        'See docs/MEDIA_STORAGE_DECISION.md for the required variables, or run ' +
        '`npm run media:up` for a local MinIO.',
    );
    this.name = 'MediaNotConfiguredError';
  }
}

/** Thrown when an upload request fails validation. Safe to show a user. */
export class MediaValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MediaValidationError';
  }
}
