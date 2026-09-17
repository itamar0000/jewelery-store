import { getMediaStorage, isPrivateKey } from '@/lib/media';

/**
 * Resolves a stored media key to something the browser can load.
 *
 * `ProductImage.storageKey` is a KEY, never a URL - a deliberate schema
 * decision, because keys survive a provider change while URLs do not
 * (ARCHITECTURE section 8, docs/MEDIA_STORAGE_DECISION.md).
 *
 * WHEN STORAGE IS NOT CONFIGURED THIS RETURNS `null`, and the gallery falls
 * back to the tonal placeholder surface. That is the honest outcome while no
 * bucket is provisioned: a fabricated URL would render as a broken image, which
 * is worse than a visible gap.
 *
 * WHAT IS REAL EVEN WITHOUT FILES. The image ROWS are real database records
 * with real alt text, ordering and variant association. The gallery genuinely
 * queries images, genuinely prefers a variant's images over the product's, and
 * genuinely re-orders on a variant change - only the bytes are missing. Once a
 * bucket exists, this function starts returning URLs and nothing else changes.
 */
/** The prefix `buildStorageKey` gives every publicly-served object. */
const PUBLIC_PREFIX = 'public/';

export interface ResolvedImage {
  readonly id: string;
  /** Browser-loadable URL, or `null` while no storage provider is configured. */
  readonly url: string | null;
  readonly altHe: string;
  readonly width: number | null;
  readonly height: number | null;
  readonly isPrimary: boolean;
  /** `null` for a product-level asset shared by every variant. */
  readonly variantId: string | null;
}

/**
 * Turns a storage key into a public URL.
 *
 * Returns `null` when storage is unconfigured, and for a PRIVATE key - a
 * custom-request upload has no public URL by design, and callers on the
 * storefront must never be handed one. Private objects are served to admins
 * through `signedReadUrl`.
 */
export function resolveImageUrl(storageKey: string): string | null {
  if (storageKey.length === 0 || isPrivateKey(storageKey)) return null;

  /*
   * ONLY A KEY THIS APPLICATION ACTUALLY STORED CAN BE RESOLVED.
   *
   * `buildStorageKey` emits exactly two shapes - `public/...` and
   * `private/...` - so a key with any other prefix was never written to a
   * bucket by this system. The seed produces such keys on purpose
   * (`demo/aurora/main.jpg`) to give every product a complete, correctly
   * ordered set of image ROWS before any photograph exists.
   *
   * Without this guard those rows become BROKEN IMAGES the moment storage is
   * configured: the resolver would happily build a URL for an object that is
   * not there, the browser would request it, and the page would render a torn
   * icon instead of the honest stand-in. That is the exact failure the header
   * note above says must not happen - and it only appears once a bucket is
   * provisioned, which is precisely when nobody is looking for it.
   *
   * Fifty-three rows were in that state the first time real photography was
   * loaded, against eighty-four that had been delivered.
   */
  if (!storageKey.startsWith(PUBLIC_PREFIX)) return null;

  const storage = getMediaStorage();
  if (storage === null) return null;

  return storage.publicUrl(storageKey);
}
