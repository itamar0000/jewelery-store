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
export type EditorialSection =
  'hero' | 'category' | 'collection' | 'atelier' | 'bridal' | 'diamonds' | 'men';

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

/** Pixel dimensions for the encoded master file. */
export interface EditorialMasterSize {
  readonly width: number;
  readonly height: number;
}

export interface EditorialMaster {
  readonly desktop: EditorialMasterSize;
  /** Present only for an asset that is separately art-directed for a phone. */
  readonly mobile?: EditorialMasterSize;
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
  /**
   * The dimensions the delivered file should be encoded at.
   *
   * DELIBERATELY NOT THE SIZE IT RENDERS AT. Several of these slots are
   * `object-fit: cover` inside a box whose shape depends on the viewport - the
   * hero is a full screen minus the header, the bridal banner is `55vh` - so
   * there is no single ratio they render at, and the category tiles render at
   * 3:4 or 1:1 depending on whether they are the lead tile. `aspect` above
   * describes the INTENT to a human; this describes the MASTER a tool encodes,
   * chosen generously enough that every real crop is a subset of it.
   *
   * That generosity is what `focalPoint` then spends: the master carries more
   * frame than any one slot needs, and the focal point decides which part
   * survives.
   *
   * `mobile` is present exactly when `mobileSrc` is - they are the same
   * decision, and a test asserts they cannot drift apart.
   */
  readonly master: EditorialMaster;
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
  | 'collection-new-arrivals'
  | 'collection-best-sellers'
  | 'collection-bridal'
  | 'collection-personalized'
  | 'atelier'
  | 'bridal'
  | 'diamonds'
  | 'men-hero'
  | 'men-wedding'
  | 'men-engraving';

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
    // ON THE SUBJECT, which in the delivered master sits in the right half:
    // earrings, three necklaces, rings and bracelets between x 55% and 85%.
    // The old 35% kept clear of copy that used to sit over the picture, and in
    // any box narrower than the photograph it cropped to the empty wall.
    //
    // VERTICALLY, THE FACE DECIDES. The desktop box is a wide band - the
    // photograph takes whatever height the headline leaves - so part of the
    // frame's height always goes, and on common laptop screens far more than
    // the 3:1 to 3.6:1 this was first tuned for: 1366x768 is about 3.5:1, a
    // 1920-wide browser 911px tall about 4.3:1, where the box shows barely
    // half the picture's height. At 55% that half began below the eyes, and
    // the hero opened on a face cut off at the nose.
    //
    // In the master the hair meets the top edge, the eyes sit at ~19% of the
    // height, the chin ~39%, the diamond pendant ~65%, the coin ~72%, the
    // bracelets ~85%. Measured in real browser windows (screen height less the
    // tabs, address bar and taskbar), the band runs from 3:1 on a 2560x1440
    // monitor to 5.3:1 on a 1366x768 laptop, where it bottoms out at its 256px
    // minimum. 24% keeps the whole face, forehead included, across that whole
    // range, and still shows the necklaces and pendants on ordinary desktops.
    // Losing a bracelet reads as a crop; losing the eyes reads as a mistake.
    focalPoint: { x: 70, y: 24 },
    // THE ATELIER HERO (D4D.26) puts the photograph in an upright column. On a
    // phone that column is the portrait master, 60vh tall; the face sits in the
    // top fifth of it, so the window is held near the top - 12% keeps hair,
    // face, necklaces and rings, and lets the bracelets go first. From 48rem the
    // wide master fills the column by its height, and the x of 70% above holds
    // the model, her necklaces and rings in it.
    mobileFocalPoint: { x: 50, y: 12 },
    aspect: 'desktop ~21:9 full-bleed · mobile ~4:5 portrait',
    // 21:9. The hero box runs between roughly 2:1 and 3:1 across real
    // desktops; 21:9 sits in the middle, so neither extreme crops hard.
    master: { desktop: { width: 2520, height: 1080 }, mobile: { width: 1280, height: 1600 } },
    brief:
      'Editorial jewellery campaign. A woman wearing the jewellery, modern luxury, ' +
      'warm ivory/champagne environment. NOTHING IS LAID OVER THIS PICTURE - the ' +
      'headline sits on paper beneath the frame - so the composition must hold the ' +
      'whole frame on its own. No reserved empty third; where the subject is not, ' +
      'carry the frame with light falloff and tone rather than bare backdrop.',
  },

  'category-rings': {
    id: 'category-rings',
    section: 'category',
    desktopSrc: `${BASE}/categories/rings.jpg`,
    alt: '',
    focalPoint: { x: 50, y: 52 },
    aspect: '16:9 landscape, cropped to the tile',
    master: { desktop: { width: 1600, height: 873 } },
    brief: 'Close-up of a hand wearing a ring. Elegant styling, hand relaxed, ring in focus.',
  },
  'category-earrings': {
    id: 'category-earrings',
    section: 'category',
    desktopSrc: `${BASE}/categories/earrings.jpg`,
    alt: '',
    focalPoint: { x: 42, y: 45 },
    aspect: '16:9 landscape, cropped to the tile',
    master: { desktop: { width: 1600, height: 873 } },
    brief: 'Side profile, close on the ear. Earring catching the light, hair back or up.',
  },
  'category-necklaces': {
    id: 'category-necklaces',
    section: 'category',
    desktopSrc: `${BASE}/categories/necklaces.jpg`,
    alt: '',
    focalPoint: { x: 50, y: 55 },
    aspect: '16:9 landscape, cropped to the tile',
    master: { desktop: { width: 1600, height: 873 } },
    brief:
      'Neck and shoulder, necklace resting at the collarbone. Skin and metal, minimal clothing detail.',
  },
  'category-bracelets': {
    id: 'category-bracelets',
    section: 'category',
    desktopSrc: `${BASE}/categories/bracelets.jpg`,
    alt: '',
    focalPoint: { x: 55, y: 50 },
    aspect: '16:9 landscape, cropped to the tile',
    master: { desktop: { width: 1600, height: 873 } },
    brief: 'Wrist and hand, bracelet in focus. Natural gesture rather than a posed product shot.',
  },
  'category-sets': {
    id: 'category-sets',
    section: 'category',
    desktopSrc: `${BASE}/categories/sets.jpg`,
    alt: '',
    focalPoint: { x: 45, y: 42 },
    aspect: '16:9 landscape, cropped to the tile',
    master: { desktop: { width: 1600, height: 873 } },
    brief:
      'The most editorial of the five: a lifestyle composition showing coordinated ' +
      'pieces worn together - necklace and earrings, or ring and bracelet.',
  },

  /*
   * COLLECTION IMAGERY, which this site went without until now.
   *
   * A collection is a curated group rather than a category, and it had no
   * picture of any kind: the band rendered as a list of names because there was
   * nothing to show. These four are still lifes rather than portraits, which is
   * the distinction that keeps them from competing with the category tiles
   * directly above them - a category is a person wearing the thing, a
   * collection is the things themselves laid out.
   *
   * Landscape, because they run as wide bands rather than as tiles.
   */
  'collection-new-arrivals': {
    id: 'collection-new-arrivals',
    section: 'collection',
    desktopSrc: `${BASE}/collections/new-arrivals.jpg`,
    alt: '',
    focalPoint: { x: 50, y: 50 },
    aspect: '3:2 landscape',
    master: { desktop: { width: 1800, height: 1200 } },
    brief:
      'Still life of several new gold pieces laid out on warm plaster with space ' +
      'between them. Fresh and uncluttered, soft raking light.',
  },
  'collection-best-sellers': {
    id: 'collection-best-sellers',
    section: 'collection',
    desktopSrc: `${BASE}/collections/best-sellers.jpg`,
    alt: '',
    focalPoint: { x: 50, y: 50 },
    aspect: '3:2 landscape',
    master: { desktop: { width: 1800, height: 1200 } },
    brief:
      'Still life of the most recognisable pieces - a solitaire standing forward, a ' +
      'tennis bracelet in a soft curve, diamond studs.',
  },
  'collection-bridal': {
    id: 'collection-bridal',
    section: 'collection',
    desktopSrc: `${BASE}/collections/bridal.jpg`,
    alt: '',
    focalPoint: { x: 50, y: 50 },
    aspect: '3:2 landscape',
    master: { desktop: { width: 1800, height: 1200 } },
    brief:
      'Bridal still life on ivory silk: an engagement ring and a matching band side ' +
      'by side, drop earrings behind. Quiet rather than sparkling.',
  },
  'collection-personalized': {
    id: 'collection-personalized',
    section: 'collection',
    desktopSrc: `${BASE}/collections/personalized.jpg`,
    alt: '',
    focalPoint: { x: 50, y: 50 },
    aspect: '3:2 landscape',
    master: { desktop: { width: 1800, height: 1200 } },
    brief:
      'Personalised pieces: a gold name pendant cut in Hebrew script, a bar pendant ' +
      'and a plain band. The lettering is CUT FROM THE GOLD, never overlaid text.',
  },

  atelier: {
    id: 'atelier',
    section: 'atelier',
    desktopSrc: `${BASE}/atelier/atelier.jpg`,
    // Meaningful: it carries the craftsmanship claim the copy makes.
    alt: 'צורף עובד על תכשיט בשולחן עבודה',
    focalPoint: { x: 50, y: 50 },
    aspect: '4:5 portrait beside the copy',
    master: { desktop: { width: 1400, height: 1750 } },
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
    /*
     * THE PHOTOGRAPH CHANGED (D4D.21). The studio portrait of a bride - a
     * different brand's glamour, against the natural light of every other
     * photograph on the site - is replaced by a quiet close view: a hand
     * resting on ivory silk, a solitaire and its band. Generated, like the
     * worn images, and in their look.
     *
     * The desktop master keeps the hand in the right third and leaves the
     * left as calm silk; the ring sits at about x77% and y50%, so the banner,
     * whatever its height, crops around it. The phone master is its own
     * portrait crop with the hand centred, so its focal point is the centre -
     * the far-left 5% the old portrait needed, and the comment that explained
     * it, went with that photograph.
     */
    focalPoint: { x: 72, y: 50 },
    mobileFocalPoint: { x: 50, y: 55 },
    aspect: 'full-bleed campaign banner',
    // 2.5:1. The banner is `55vh` clamped between 26rem and 34rem, which is
    // a wider, shorter box than the hero at every viewport.
    master: { desktop: { width: 2400, height: 960 }, mobile: { width: 1280, height: 1600 } },
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
    master: { desktop: { width: 1400, height: 1750 } },
    brief:
      'Macro of a diamond set into a piece. Premium gemstone close-up, real ' +
      'refraction rather than CGI sparkle. MUST NOT imply the stone is lab-grown: ' +
      'the section explains that the catalog carries both natural and lab-grown, ' +
      'so the image has to stay neutral. No laboratory or "technology" imagery.',
  },

  /*
   * THE MEN'S DEPARTMENT (D4D.34). Three worn images, to be generated like
   * the bridal photograph (D4D.21) and in the same daylight look: a man's
   * hand, hands, or a still life - NEVER a recognisable face - and the piece
   * as the catalogue makes it. Generated with `scripts/generate-editorial.ts`
   * (its COMPOSITION entries carry the framing); a better frame, or a real
   * photograph, is a file replaced at the same path.
   */
  'men-hero': {
    id: 'men-hero',
    section: 'men',
    desktopSrc: `${BASE}/men/hero.jpg`,
    alt: '',
    focalPoint: { x: 50, y: 50 },
    aspect: 'the hero photograph column: tall on desktop, 46% of a phone screen',
    master: { desktop: { width: 1600, height: 1600 } },
    brief:
      "A man's hand resting on a dark wool or linen surface, wearing a plain oval " +
      '14K yellow-gold signet ring on the little or ring finger. Hand only, from the ' +
      'wrist; no face. Soft daylight from one side, warm and natural. The ring is ' +
      'the polished signet of the catalogue - no engraving, no stone.',
  },
  'men-wedding': {
    id: 'men-wedding',
    section: 'men',
    desktopSrc: `${BASE}/men/wedding.jpg`,
    alt: '',
    focalPoint: { x: 50, y: 50 },
    aspect: '4:5 portrait beside the copy',
    master: { desktop: { width: 1400, height: 1750 } },
    brief:
      "Two hands, a man's and a woman's, lightly together, each wearing a plain " +
      '14K gold wedding band - his wider, hers narrower. Hands only, no faces, no ' +
      'flowers or venue. Ivory linen behind, soft daylight.',
  },
  'men-engraving': {
    id: 'men-engraving',
    section: 'men',
    desktopSrc: `${BASE}/men/engraving.jpg`,
    alt: '',
    focalPoint: { x: 50, y: 50 },
    aspect: '4:5 portrait beside the copy',
    master: { desktop: { width: 1400, height: 1750 } },
    brief:
      'Close still life: an oval 14K yellow-gold signet ring lying on its side on ' +
      'warm ivory paper, its face engraved with two Latin initials in a classic ' +
      "serif, the engraving cut into the gold. A goldsmith's burin beside it. No " +
      'other text anywhere in the frame.',
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
