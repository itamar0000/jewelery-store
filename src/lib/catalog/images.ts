/**
 * Resolves a stored media key to something the browser can load.
 *
 * `ProductImage.storageKey` is a KEY, never a URL - a deliberate schema
 * decision, because the storage provider is still undecided (TBD.md I1) and
 * keys survive a provider change while URLs do not.
 *
 * NO PROVIDER IS CONFIGURED YET, so this returns `null` for every key, and the
 * gallery falls back to the tonal placeholder surface. That is the honest
 * outcome: there is no photography, and inventing a URL would produce broken
 * images rather than a visible gap.
 *
 * WHAT IS REAL EVEN WITHOUT FILES. The image ROWS are real database records
 * with real alt text, real ordering and a real variant association. So the
 * gallery genuinely queries images, genuinely picks the variant's images over
 * the product's, and genuinely re-orders on a variant change - the only missing
 * piece is the bytes. When a provider lands, this one function starts returning
 * URLs and the gallery needs no change.
 */
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
 * Turns a storage key into a URL.
 *
 * Returns `null` until a provider exists. Kept as a function rather than a
 * constant so the call sites are already correct.
 */
export function resolveImageUrl(_storageKey: string): string | null {
  return null;
}
