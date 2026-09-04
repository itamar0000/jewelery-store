import { existsSync } from 'node:fs';
import path from 'node:path';

/**
 * THE EDITORIAL ASSET REGISTRY.
 *
 * One place that knows every editorial image the storefront can show, what it
 * should depict, where it belongs and how it should be cropped. No component
 * contains an image path.
 *
 * EDITORIAL IS NOT PRODUCT PHOTOGRAPHY, and the two systems are deliberately
 * separate:
 *
 *   EDITORIAL (this file) - hero, category tiles, atelier, bridal, diamonds.
 *   Local files under `public/images/editorial/`, committed with the repo,
 *   static, art-directed. They create brand and atmosphere. They are the same
 *   for every visitor and never change without a deploy.
 *
 *   PRODUCT (src/lib/media + the `ProductImage` table) - the actual goods.
 *   Uploaded by the owner, stored in a bucket, keyed per product and variant.
 *   They carry exact representation and are what a purchase decision rests on.
 *
 * Mixing them would be a real mistake, not a stylistic one: a shopper must
 * never be unable to tell an aspirational campaign frame from the item they are
 * about to buy.
 *
 * NOTHING HERE IS INVENTED. Every `src` below points at a file that does not
 * exist yet. That is the intended state: the business supplies real product
 * photography, and the editorial images are art-directed separately. Until a
 * file appears, `resolveEditorialAsset` reports it missing and the section
 * renders a visible development placeholder rather than a broken image.
 *
 * ADDING AN IMAGE IS A FILE DROP. Put the file at the declared path, restart in
 * development (or redeploy), and it appears. No code change.
 */

/** Where in the page an asset belongs. Documentation, and a grouping key. */
export type EditorialSection = 'hero' | 'category' | 'atelier' | 'bridal' | 'diamonds';

/**
 * The point that must survive every crop, in percent.
 *
 * `{ x: 50, y: 35 }` means "hold the centre horizontally, a third down
 * vertically". It becomes `object-position`, so a wide desktop crop and a tall
 * phone crop keep the jewellery in frame instead of beheading the model.
 *
 * This exists so cropping is solved ONCE, as data, rather than by nudging
 * arbitrary CSS in each section - which is how crops silently break at one
 * breakpoint and nobody notices.
 */
export interface FocalPoint {
  readonly x: number;
  readonly y: number;
}

export interface EditorialAsset {
  readonly id: EditorialAssetId;
  readonly section: EditorialSection;
  readonly desktopSrc: string;
  /** A separately art-directed portrait crop. Optional. */
  readonly mobileSrc?: string;
  /**
   * Alt text.
   *
   * EMPTY STRING MEANS DECORATIVE, and that is a deliberate choice per asset
   * rather than an oversight. Where the surrounding HTML already names the
   * thing - a category tile whose label reads "טבעות", a hero whose `<h1>`
   * carries the headline - a description of the photograph adds nothing to a
   * screen reader and duplicates what it just heard. Where the image is the
   * only content, it is described.
   */
  readonly alt: string;
  readonly focalPoint?: FocalPoint;
  /** Overrides `focalPoint` for the mobile crop, which is usually tighter. */
  readonly mobileFocalPoint?: FocalPoint;
  /** The crop the section renders it at. Part of the shot brief. */
  readonly aspect: string;
  /** What the picture must show. This IS the brief handed to whoever makes it. */
  readonly brief: string;
}

export type EditorialAssetId =
  | 'hero'
  | 'category-rings'
  | 'category-earrings'
  | 'category-necklaces'
  | 'category-bracelets'
  | 'category-sets'
  | 'atelier'
  | 'bridal'
  | 'diamonds';

const BASE = '/images/editorial';

/**
 * SHARED ART DIRECTION, stated once so the nine images read as one campaign.
 *
 * Light: ivory, cream, pearl, champagne, warm neutrals. Dark where needed:
 * muted black, deep brown. Metal: realistic gold, not chrome. Lighting: soft
 * and directional, natural highlights, restrained shadows.
 *
 * Avoid: blown-out white studio lighting, CGI-looking jewellery, heavy bokeh,
 * black-and-gold "luxury" clichés, generic fashion stock.
 *
 * NO TEXT IN ANY IMAGE - no logo, slogan, typography, watermark or UI. Every
 * word on this site is HTML, which is what lets the branding change later
 * without re-shooting anything.
 */
export const EDITORIAL_ART_DIRECTION =
  'Warm ivory / cream / champagne palette, soft directional light, realistic gold ' +
  'tones, restrained shadows. No text, logos or watermarks of any kind.';

export const EDITORIAL_ASSETS: Readonly<Record<EditorialAssetId, EditorialAsset>> = {
  hero: {
    id: 'hero',
    section: 'hero',
    desktopSrc: `${BASE}/hero/hero-desktop.jpg`,
    mobileSrc: `${BASE}/hero/hero-mobile.jpg`,
    // Decorative: the <h1> beside it carries the message.
    alt: '',
    // Held slightly above centre so the jewellery survives the bottom crop on a
    // tall phone, and clear of the inline-start third where the copy sits.
    focalPoint: { x: 35, y: 40 },
    mobileFocalPoint: { x: 50, y: 32 },
    aspect: 'desktop ~21:9 full-bleed · mobile ~4:5 portrait',
    brief:
      'Editorial jewellery campaign. A woman wearing the jewellery, modern luxury, ' +
      'warm ivory/champagne environment. Generous negative space on the inline-start ' +
      '(right, in RTL) third, where the headline and buttons sit.',
  },

  'category-rings': {
    id: 'category-rings',
    section: 'category',
    desktopSrc: `${BASE}/categories/rings.jpg`,
    alt: '',
    focalPoint: { x: 50, y: 45 },
    aspect: '4:5 portrait',
    brief: 'Close-up of a hand wearing a ring. Elegant styling, hand relaxed, ring in focus.',
  },
  'category-earrings': {
    id: 'category-earrings',
    section: 'category',
    desktopSrc: `${BASE}/categories/earrings.jpg`,
    alt: '',
    focalPoint: { x: 50, y: 40 },
    aspect: '4:5 portrait',
    brief: 'Side profile, close on the ear. Earring catching the light, hair back or up.',
  },
  'category-necklaces': {
    id: 'category-necklaces',
    section: 'category',
    desktopSrc: `${BASE}/categories/necklaces.jpg`,
    alt: '',
    focalPoint: { x: 50, y: 45 },
    aspect: '4:5 portrait',
    brief:
      'Neck and shoulder, necklace resting at the collarbone. Skin and metal, minimal clothing detail.',
  },
  'category-bracelets': {
    id: 'category-bracelets',
    section: 'category',
    desktopSrc: `${BASE}/categories/bracelets.jpg`,
    alt: '',
    focalPoint: { x: 50, y: 50 },
    aspect: '4:5 portrait',
    brief: 'Wrist and hand, bracelet in focus. Natural gesture rather than a posed product shot.',
  },
  'category-sets': {
    id: 'category-sets',
    section: 'category',
    desktopSrc: `${BASE}/categories/sets.jpg`,
    alt: '',
    focalPoint: { x: 50, y: 40 },
    aspect: '4:5 portrait',
    brief:
      'The most editorial of the five: a lifestyle composition showing coordinated ' +
      'pieces worn together - necklace and earrings, or ring and bracelet.',
  },

  atelier: {
    id: 'atelier',
    section: 'atelier',
    desktopSrc: `${BASE}/atelier/atelier.jpg`,
    // Meaningful: it carries the craftsmanship claim the copy makes.
    alt: 'צורף עובד על תכשיט בשולחן עבודה',
    focalPoint: { x: 50, y: 50 },
    aspect: '4:5 portrait beside the copy',
    brief:
      'Craftsmanship, not commerce. Hands working: stone setting, a goldsmith at the ' +
      'bench, tools, a sketch beside a piece. Warm task lighting. NOT a business ' +
      'meeting, NOT a generic studio scene.',
  },

  bridal: {
    id: 'bridal',
    section: 'bridal',
    desktopSrc: `${BASE}/bridal/bridal-desktop.jpg`,
    mobileSrc: `${BASE}/bridal/bridal-mobile.jpg`,
    alt: '',
    focalPoint: { x: 40, y: 40 },
    mobileFocalPoint: { x: 50, y: 35 },
    aspect: 'full-bleed campaign banner',
    brief:
      'A jewellery campaign that happens to be bridal - not wedding stock. Elegant, ' +
      'close or medium crop, jewellery clearly visible, soft refined light, ' +
      'ivory/champagne palette. No bouquets, no venues, no confetti.',
  },

  diamonds: {
    id: 'diamonds',
    section: 'diamonds',
    desktopSrc: `${BASE}/diamonds/diamonds.jpg`,
    alt: 'תקריב של יהלום משובץ בתכשיט',
    focalPoint: { x: 50, y: 50 },
    aspect: '4:5 portrait beside the copy',
    brief:
      'Macro of a diamond set into a piece. Premium gemstone close-up, real ' +
      'refraction rather than CGI sparkle. MUST NOT imply the stone is lab-grown: ' +
      'the section explains that the catalog carries both natural and lab-grown, ' +
      'so the image has to stay neutral. No laboratory or "technology" imagery.',
  },
};

/** Every asset, for the shot list and for tests. */
export const EDITORIAL_ASSET_LIST: readonly EditorialAsset[] = Object.values(EDITORIAL_ASSETS);

/**
 * What a section needs in order to render.
 *
 * `available: false` means the file is not on disk yet, and the caller shows
 * the development placeholder instead. That check is what stops a missing file
 * becoming a broken-image icon in front of a reviewer.
 */
export interface ResolvedEditorialAsset {
  readonly asset: EditorialAsset;
  readonly available: boolean;
  readonly desktopSrc: string;
  readonly mobileSrc: string | null;
  readonly alt: string;
  readonly objectPosition: string;
  readonly mobileObjectPosition: string;
}

/**
 * Existence cache.
 *
 * Populated in production, where the file set cannot change while the process
 * runs. NOT cached in development, so dropping a file into
 * `public/images/editorial/` and reloading shows it - which is the whole point
 * of a file-drop workflow.
 */
const existsCache = new Map<string, boolean>();

function fileExists(publicPath: string): boolean {
  const production = process.env.NODE_ENV === 'production';

  if (production) {
    const cached = existsCache.get(publicPath);
    if (cached !== undefined) return cached;
  }

  // `publicPath` always begins with `/` and comes from this module only - never
  // from a request - so it cannot be steered outside `public/`.
  const onDisk = path.join(process.cwd(), 'public', publicPath.replace(/^\/+/, ''));
  const exists = existsSync(onDisk);

  if (production) existsCache.set(publicPath, exists);

  return exists;
}

function toObjectPosition(point: FocalPoint | undefined): string {
  return point ? `${point.x}% ${point.y}%` : '50% 50%';
}

/**
 * Resolves an asset for rendering.
 *
 * SERVER ONLY - it touches the filesystem. Every editorial section is a server
 * component, so this is a natural fit rather than a constraint.
 *
 * A mobile source is only reported when the file is actually present, so a
 * half-delivered pair (desktop shot in, phone crop still pending) degrades to
 * using the desktop image at both sizes rather than 404-ing on phones.
 */
export function resolveEditorialAsset(id: EditorialAssetId): ResolvedEditorialAsset {
  const asset = EDITORIAL_ASSETS[id];

  const desktopAvailable = fileExists(asset.desktopSrc);
  const mobileAvailable = asset.mobileSrc !== undefined && fileExists(asset.mobileSrc);

  return {
    asset,
    available: desktopAvailable,
    desktopSrc: asset.desktopSrc,
    mobileSrc: mobileAvailable ? (asset.mobileSrc ?? null) : null,
    alt: asset.alt,
    objectPosition: toObjectPosition(asset.focalPoint),
    mobileObjectPosition: toObjectPosition(asset.mobileFocalPoint ?? asset.focalPoint),
  };
}

/** Which assets are still missing. Used by the development shot-list script. */
export function missingEditorialAssets(): readonly EditorialAsset[] {
  return EDITORIAL_ASSET_LIST.filter((asset) => !fileExists(asset.desktopSrc));
}
