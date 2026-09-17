import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { resetMediaStorageCache } from '@/lib/media';

import { resolveImageUrl } from './images';

/**
 * These tests configure storage, because the interesting behaviour only exists
 * once a bucket is provisioned.
 *
 * With no provider configured `resolveImageUrl` returns `null` for everything
 * and every branch below passes trivially - which is exactly why the bug these
 * cover survived so long. The catalog carried rows pointing at keys that had
 * never been written, and while `MEDIA_S3_*` was unset they rendered as honest
 * placeholders. The moment real photography was loaded and the provider came
 * up, those same rows started resolving to URLs for objects that do not exist,
 * and fifty-three of them turned into broken images across the site.
 */
const CONFIG: Readonly<Record<string, string>> = {
  MEDIA_S3_ENDPOINT: 'http://localhost:9000',
  MEDIA_S3_REGION: 'us-east-1',
  MEDIA_S3_BUCKET: 'test-bucket',
  MEDIA_S3_ACCESS_KEY_ID: 'test',
  MEDIA_S3_SECRET_ACCESS_KEY: 'test-secret',
  MEDIA_PUBLIC_BASE_URL: 'http://localhost:9000/test-bucket',
};

const saved = new Map<string, string | undefined>();

beforeEach(() => {
  for (const [key, value] of Object.entries(CONFIG)) {
    saved.set(key, process.env[key]);
    process.env[key] = value;
  }
  resetMediaStorageCache();
});

afterEach(() => {
  for (const [key, value] of saved) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  saved.clear();
  resetMediaStorageCache();
});

describe('resolveImageUrl', () => {
  it('resolves a key this application actually stored', () => {
    expect(resolveImageUrl('public/products/abc/123-ring.jpg')).toBe(
      'http://localhost:9000/test-bucket/public/products/abc/123-ring.jpg',
    );
  });

  /**
   * THE REGRESSION THIS FILE EXISTS FOR.
   *
   * The seed gives every product a complete set of image ROWS before any
   * photograph exists, using keys like `demo/aurora/main.jpg`. Those rows are
   * deliberate - they carry real alt text, ordering and variant association -
   * but nothing was ever uploaded for them.
   *
   * `buildStorageKey` only ever emits `public/…` or `private/…`, so any other
   * prefix is a key this system did not write, and handing back a URL for it
   * produces a request that 404s and a torn image icon on the page.
   */
  it('refuses a key that was never written to the bucket', () => {
    expect(resolveImageUrl('demo/aurora/main.jpg')).toBeNull();
    expect(resolveImageUrl('seed/placeholder.png')).toBeNull();
  });

  /** A customer upload has no public URL by design (spec §17, §48). */
  it('refuses a private key even though storage is configured', () => {
    expect(resolveImageUrl('private/custom-requests/abc/sketch.jpg')).toBeNull();
  });

  it('refuses an empty key', () => {
    expect(resolveImageUrl('')).toBeNull();
  });

  /**
   * `public` as a bare segment is not the prefix - `publicity/…` must not pass
   * a naive `startsWith('public')` check.
   */
  it('requires the prefix to be a whole path segment', () => {
    expect(resolveImageUrl('publicity/products/abc/1.jpg')).toBeNull();
  });
});
