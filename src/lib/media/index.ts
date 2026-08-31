import { MediaNotConfiguredError, type MediaStorage } from './provider';
import { S3MediaStorage, readS3ConfigFromEnv } from './s3';

/**
 * The media module. Import from `@/lib/media`, never from the files inside.
 *
 * STORAGE IS OPTIONAL AT RUNTIME, and that is the whole point of this file.
 * No provider is provisioned yet (docs/MEDIA_STORAGE_DECISION.md), so:
 *
 *   - the application must boot without credentials;
 *   - the storefront must render, falling back to the placeholder surface;
 *   - tests must run;
 *   - and nothing may PRETEND an upload happened.
 *
 * `getMediaStorage()` returns `null` when unconfigured, so a caller that can
 * degrade does so explicitly. `requireMediaStorage()` throws a legible error
 * naming the missing variables, for callers that cannot - an admin upload has
 * no sensible fallback and must say so.
 *
 * SERVER ONLY. Credentials are read here; importing this into a client
 * component fails the build, which is the guard we want.
 */
let cached: MediaStorage | null | undefined;

export function getMediaStorage(): MediaStorage | null {
  // Cached because reading the environment and constructing an S3 client on
  // every call would be wasteful, and the configuration cannot change within a
  // process.
  if (cached !== undefined) return cached;

  const config = readS3ConfigFromEnv();
  cached = config === null ? null : new S3MediaStorage(config);

  return cached;
}

/** For callers with no sensible fallback - an admin upload. */
export function requireMediaStorage(): MediaStorage {
  const storage = getMediaStorage();

  if (storage === null) {
    throw new MediaNotConfiguredError([
      'MEDIA_S3_ENDPOINT',
      'MEDIA_S3_REGION',
      'MEDIA_S3_BUCKET',
      'MEDIA_S3_ACCESS_KEY_ID',
      'MEDIA_S3_SECRET_ACCESS_KEY',
      'MEDIA_PUBLIC_BASE_URL',
    ]);
  }

  return storage;
}

/** Whether media storage is available. Cheap; safe to call during render. */
export function isMediaConfigured(): boolean {
  return getMediaStorage() !== null;
}

/** Test seam: forget the cached instance so a new environment is read. */
export function resetMediaStorageCache(): void {
  cached = undefined;
}

export {
  MediaNotConfiguredError,
  MediaValidationError,
  type CreateUploadInput,
  type ImageContentType,
  type MediaStorage,
  type MediaVisibility,
  type UploadTarget,
} from './provider';

export {
  ACCEPTED_CONTENT_TYPES,
  MAX_UPLOAD_BYTES,
  buildStorageKey,
  imageMetadataSchema,
  isPrivateKey,
  parseImageMetadata,
  parseUploadRequest,
  safeSlug,
  uploadRequestSchema,
  type ImageMetadata,
  type UploadRequest,
} from './validation';

export { S3MediaStorage, readS3ConfigFromEnv, type S3MediaConfig } from './s3';
