import { beforeAll, describe, expect, it } from 'vitest';

import { S3MediaStorage, type S3MediaConfig } from './s3';

/**
 * The storage adapter against a REAL S3 endpoint.
 *
 * Runs against MinIO from docker-compose (`npm run media:up`), which speaks the
 * same API as Cloudflare R2 and AWS S3. That is a large part of why
 * S3-compatible storage was chosen: the adapter is exercised for real, locally
 * and in CI, with no cloud account and no mocked client
 * (docs/MEDIA_STORAGE_DECISION.md).
 *
 * SKIPPED WHEN MINIO IS NOT RUNNING, rather than failing. Storage is optional
 * infrastructure - `npm test` must pass on a machine that has never started it.
 * The offline suite in media.test.ts covers key construction, validation and
 * URL building unconditionally, which is where the security-relevant logic is.
 *
 * The skip is deliberately visible in the run output, so a green suite never
 * silently means "the round trip was never tried".
 */
const CONFIG: S3MediaConfig = {
  endpoint: process.env.MEDIA_S3_ENDPOINT ?? 'http://localhost:9000',
  region: process.env.MEDIA_S3_REGION ?? 'us-east-1',
  bucket: process.env.MEDIA_S3_BUCKET ?? 'jewelry-media',
  accessKeyId: process.env.MEDIA_S3_ACCESS_KEY_ID ?? 'jewelry_dev',
  secretAccessKey: process.env.MEDIA_S3_SECRET_ACCESS_KEY ?? 'jewelry_local_dev',
  publicBaseUrl:
    process.env.MEDIA_PUBLIC_BASE_URL ??
    `${process.env.MEDIA_S3_ENDPOINT ?? 'http://localhost:9000'}/${
      process.env.MEDIA_S3_BUCKET ?? 'jewelry-media'
    }`,
};

async function minioReachable(): Promise<boolean> {
  try {
    const response = await fetch(`${CONFIG.endpoint}/minio/health/live`, {
      signal: AbortSignal.timeout(1500),
    });
    return response.ok;
  } catch {
    return false;
  }
}

let available = false;

beforeAll(async () => {
  available = await minioReachable();

  if (!available) {
    console.warn(
      `\n  media.integration: SKIPPED - no S3 endpoint at ${CONFIG.endpoint}.` +
        '\n  Run `npm run media:up && npm run media:init` to exercise the real round trip.\n',
    );
  }
});

/** A minimal but genuinely valid 1x1 PNG. */
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

describe('S3MediaStorage against a real endpoint', () => {
  it('signs an upload, stores the object, serves it publicly, then deletes it', async () => {
    if (!available) return;

    const storage = new S3MediaStorage(CONFIG);

    const target = await storage.createUpload({
      contentType: 'image/png',
      bytes: PNG_1X1.byteLength,
      originalFilename: 'Aurora Ring Front.png',
      productId: 'integration-test',
    });

    // The key must be safe and derived from the content type, not the filename.
    expect(target.key).toMatch(/^public\/products\/integration-test\/[\w-]+\.png$/);
    expect(target.expiresAt.getTime()).toBeGreaterThan(Date.now());

    // Upload exactly as a browser would: the presigned URL plus the headers the
    // signature covers.
    const put = await fetch(target.url, {
      method: 'PUT',
      headers: target.headers,
      body: new Uint8Array(PNG_1X1),
    });
    expect(put.ok).toBe(true);

    // The public URL must serve the bytes back, which is what the storefront
    // will render through next/image.
    const publicUrl = storage.publicUrl(target.key);
    const fetched = await fetch(publicUrl);

    expect(fetched.ok).toBe(true);
    expect(fetched.headers.get('content-type')).toBe('image/png');
    expect((await fetched.arrayBuffer()).byteLength).toBe(PNG_1X1.byteLength);

    await storage.delete(target.key);

    const afterDelete = await fetch(publicUrl);
    expect(afterDelete.ok).toBe(false);
  });

  it('deleting an absent key succeeds, so cleanup after a failed upload is safe', async () => {
    if (!available) return;

    const storage = new S3MediaStorage(CONFIG);
    await expect(
      storage.delete('public/products/none/does-not-exist.jpg'),
    ).resolves.toBeUndefined();
  });

  /**
   * The private namespace is what makes custom-request uploads (§17, §48)
   * private by construction: the bucket policy grants public read on
   * `public/*` only, so a private object is unreadable without a signature
   * even if its key leaks.
   */
  it('keeps private objects out of public reach, but readable with a signature', async () => {
    if (!available) return;

    const storage = new S3MediaStorage(CONFIG);

    const target = await storage.createUpload({
      contentType: 'image/png',
      bytes: PNG_1X1.byteLength,
      visibility: 'private',
      productId: 'integration-test',
    });

    expect(target.key.startsWith('private/')).toBe(true);

    await fetch(target.url, {
      method: 'PUT',
      headers: target.headers,
      body: new Uint8Array(PNG_1X1),
    });

    // No public URL exists for it, and asking for one is a programming error.
    expect(() => storage.publicUrl(target.key)).toThrow();

    // Fetching the raw path without a signature must be refused.
    const unsigned = await fetch(`${CONFIG.endpoint}/${CONFIG.bucket}/${target.key}`);
    expect(unsigned.ok).toBe(false);

    // A signed read works.
    const signed = await storage.signedReadUrl(target.key, 60);
    const signedFetch = await fetch(signed);
    expect(signedFetch.ok).toBe(true);

    await storage.delete(target.key);
  });

  it('refuses an upload whose declared size differs from the bytes sent', async () => {
    if (!available) return;

    const storage = new S3MediaStorage(CONFIG);

    // The declared length is part of what was signed, so the client cannot
    // revise it after the fact and push a larger file than was authorized.
    const target = await storage.createUpload({
      contentType: 'image/png',
      bytes: PNG_1X1.byteLength,
      productId: 'integration-test',
    });

    const oversized = Buffer.concat([PNG_1X1, Buffer.alloc(4096)]);
    const put = await fetch(target.url, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/png', 'Content-Length': String(oversized.byteLength) },
      body: new Uint8Array(oversized),
    });

    expect(put.ok).toBe(false);
  });
});
