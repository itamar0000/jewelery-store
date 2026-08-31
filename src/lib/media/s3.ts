import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import {
  MediaNotConfiguredError,
  type CreateUploadInput,
  type MediaStorage,
  type UploadTarget,
} from './provider';
import { buildStorageKey, isPrivateKey, parseUploadRequest } from './validation';

/**
 * S3-compatible media storage.
 *
 * Works unchanged against Cloudflare R2, AWS S3, Backblaze B2 and MinIO,
 * because all four implement the same API - which is the portability argument
 * that decided the provider (docs/MEDIA_STORAGE_DECISION.md).
 *
 * `forcePathStyle` is on because MinIO and R2 both address buckets by path;
 * virtual-host addressing is an AWS-ism that would break local development.
 */
export interface S3MediaConfig {
  readonly endpoint: string;
  readonly region: string;
  readonly bucket: string;
  readonly accessKeyId: string;
  readonly secretAccessKey: string;
  /** Public base URL objects are served from, without a trailing slash. */
  readonly publicBaseUrl: string;
}

/** How long an upload target stays valid. */
const UPLOAD_TTL_SECONDS = 5 * 60;

/** How long a private read URL stays valid. */
const READ_TTL_SECONDS = 5 * 60;

export class S3MediaStorage implements MediaStorage {
  private readonly client: S3Client;

  constructor(private readonly config: S3MediaConfig) {
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  /**
   * Signs a single-purpose upload target.
   *
   * The signature covers the key, the method AND the content type, so a URL
   * issued for a JPEG cannot be reused to upload something else. Validation
   * happens first: the signature is the authorization, so signing before
   * checking would authorize an unchecked upload.
   */
  async createUpload(input: CreateUploadInput): Promise<UploadTarget> {
    const request = parseUploadRequest(input);

    const key = buildStorageKey({
      contentType: request.contentType,
      originalFilename: request.originalFilename,
      productId: request.productId,
      visibility: request.visibility,
    });

    const command = new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
      ContentType: request.contentType,
      ContentLength: request.bytes,
    });

    const url = await getSignedUrl(this.client, command, { expiresIn: UPLOAD_TTL_SECONDS });

    return {
      url,
      key,
      // The browser must send exactly these, or the signature will not match -
      // which is the point: the declared size and type are part of what was
      // authorized, not a hint the client may revise.
      headers: {
        'Content-Type': request.contentType,
        'Content-Length': String(request.bytes),
      },
      expiresAt: new Date(Date.now() + UPLOAD_TTL_SECONDS * 1000),
    };
  }

  async delete(key: string): Promise<void> {
    // S3 delete is idempotent: removing an absent key succeeds, which is the
    // behaviour a caller cleaning up after a failed upload wants.
    await this.client.send(new DeleteObjectCommand({ Bucket: this.config.bucket, Key: key }));
  }

  /**
   * The canonical URL for a public object.
   *
   * One URL per object. `next/image` derives every responsive width and modern
   * format from it, so no derivative files exist to keep in sync.
   */
  publicUrl(key: string): string {
    if (isPrivateKey(key)) {
      // Returning a URL that 403s would be a worse answer than refusing: it
      // would look like a broken image rather than a programming mistake.
      throw new Error(
        `Refusing to build a public URL for a private key (${key.split('/')[0]}/…). ` +
          'Private objects are served through signedReadUrl.',
      );
    }

    return `${this.config.publicBaseUrl.replace(/\/+$/, '')}/${key}`;
  }

  async signedReadUrl(key: string, expiresInSeconds = READ_TTL_SECONDS): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.config.bucket, Key: key });
    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }
}

/**
 * Reads configuration from the environment.
 *
 * Returns `null` rather than throwing when nothing is configured, so the
 * application boots and the storefront falls back to the placeholder surface.
 * A PARTIAL configuration is different and does throw: half-set variables are a
 * deployment mistake, and silently behaving as if storage were absent would
 * hide it.
 */
export function readS3ConfigFromEnv(
  env: Record<string, string | undefined> = process.env,
): S3MediaConfig | null {
  const names = [
    'MEDIA_S3_ENDPOINT',
    'MEDIA_S3_REGION',
    'MEDIA_S3_BUCKET',
    'MEDIA_S3_ACCESS_KEY_ID',
    'MEDIA_S3_SECRET_ACCESS_KEY',
    'MEDIA_PUBLIC_BASE_URL',
  ] as const;

  const present = names.filter((name) => (env[name] ?? '').trim().length > 0);

  if (present.length === 0) return null;

  if (present.length < names.length) {
    throw new MediaNotConfiguredError(names.filter((name) => !present.includes(name)));
  }

  return {
    endpoint: env.MEDIA_S3_ENDPOINT!,
    region: env.MEDIA_S3_REGION!,
    bucket: env.MEDIA_S3_BUCKET!,
    accessKeyId: env.MEDIA_S3_ACCESS_KEY_ID!,
    secretAccessKey: env.MEDIA_S3_SECRET_ACCESS_KEY!,
    publicBaseUrl: env.MEDIA_PUBLIC_BASE_URL!,
  };
}
