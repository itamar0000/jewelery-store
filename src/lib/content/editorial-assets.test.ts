import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  EDITORIAL_ASSETS,
  EDITORIAL_ASSET_LIST,
  missingEditorialAssets,
  resolveEditorialAsset,
  type EditorialAssetId,
} from './editorial-assets';

/**
 * Availability is decided by the filesystem, so the tests that cover it have to
 * touch the filesystem. Files are written under `public/` - the only place
 * `resolveEditorialAsset` looks - and removed again in `afterEach`, including
 * when the assertion throws.
 *
 * Real bytes are not needed: nothing here decodes the image. What is under test
 * is the presence check and everything it drives.
 */
const created: string[] = [];

function placeFile(publicPath: string): void {
  const onDisk = path.join(process.cwd(), 'public', publicPath.replace(/^\/+/, ''));
  mkdirSync(path.dirname(onDisk), { recursive: true });
  writeFileSync(onDisk, '');
  created.push(onDisk);
}

afterEach(() => {
  for (const file of created) rmSync(file, { force: true });
  created.length = 0;
});

describe('the editorial asset registry', () => {
  it('keys every asset by its own id', () => {
    for (const [key, asset] of Object.entries(EDITORIAL_ASSETS)) {
      expect(asset.id).toBe(key);
    }
  });

  /**
   * THE CONSTRAINT THAT MATTERS MOST IN THIS FILE.
   *
   * Every editorial source must be a local file this repository controls. A
   * remote URL here would mean the storefront was decorating itself with an
   * image nobody licensed - which is the specific thing the brief forbids, and
   * it would slip in silently because the page would still render.
   */
  it('points only at local files under the editorial directory', () => {
    for (const asset of EDITORIAL_ASSET_LIST) {
      expect(asset.desktopSrc).toMatch(/^\/images\/editorial\//);
      if (asset.mobileSrc) expect(asset.mobileSrc).toMatch(/^\/images\/editorial\//);
    }
  });

  /**
   * Each slot is its own photograph. Sharing one file between, say, the ring
   * and bracelet tiles would render as a category grid that repeats itself -
   * the failure the brief calls out by name.
   */
  it('gives every slot a distinct file', () => {
    const sources = EDITORIAL_ASSET_LIST.flatMap((asset) =>
      asset.mobileSrc ? [asset.desktopSrc, asset.mobileSrc] : [asset.desktopSrc],
    );

    expect(new Set(sources).size).toBe(sources.length);
  });

  it('states a brief for every asset', () => {
    for (const asset of EDITORIAL_ASSET_LIST) {
      expect(asset.brief.length).toBeGreaterThan(20);
      expect(asset.aspect.length).toBeGreaterThan(0);
    }
  });

  it('keeps focal points inside the frame', () => {
    for (const asset of EDITORIAL_ASSET_LIST) {
      for (const point of [asset.focalPoint, asset.mobileFocalPoint]) {
        if (!point) continue;
        expect(point.x).toBeGreaterThanOrEqual(0);
        expect(point.x).toBeLessThanOrEqual(100);
        expect(point.y).toBeGreaterThanOrEqual(0);
        expect(point.y).toBeLessThanOrEqual(100);
      }
    }
  });
});

describe('alt text', () => {
  /**
   * Empty alt is a DECISION here, not an omission, so it is asserted as one.
   *
   * The hero and the category tiles are decorative: the `<h1>` and the tile
   * labels already say what a screen reader needs, and describing the
   * photograph again would only repeat it.
   */
  it('is empty where the surrounding HTML already names the thing', () => {
    for (const id of [
      'hero',
      'category-rings',
      'category-earrings',
      'category-necklaces',
      'category-bracelets',
      'category-sets',
      'bridal',
    ] satisfies EditorialAssetId[]) {
      expect(resolveEditorialAsset(id).alt).toBe('');
    }
  });

  /** The atelier and diamond images carry a claim the copy makes, so they are described. */
  it('describes the images that are content rather than decoration', () => {
    for (const id of ['atelier', 'diamonds'] satisfies EditorialAssetId[]) {
      expect(resolveEditorialAsset(id).alt.trim().length).toBeGreaterThan(0);
    }
  });
});

describe('resolveEditorialAsset', () => {
  it('reports an asset as unavailable while its file is missing', () => {
    const resolved = resolveEditorialAsset('category-rings');

    expect(resolved.available).toBe(false);
    expect(resolved.mobileSrc).toBeNull();
  });

  it('reports an asset as available once the file is on disk', () => {
    placeFile(EDITORIAL_ASSETS['category-rings'].desktopSrc);

    expect(resolveEditorialAsset('category-rings').available).toBe(true);
  });

  it('turns the focal point into an object-position', () => {
    // hero: desktop { x: 35, y: 40 }, mobile { x: 50, y: 32 }.
    const resolved = resolveEditorialAsset('hero');

    expect(resolved.objectPosition).toBe('35% 40%');
    expect(resolved.mobileObjectPosition).toBe('50% 32%');
  });

  it('falls back to the centre when an asset declares no focal point', () => {
    // Every asset currently declares one, so this asserts the default rather
    // than a particular asset: a new slot added without a focal point must
    // centre, not crash or emit an invalid value.
    const withoutFocal = EDITORIAL_ASSET_LIST.filter((asset) => !asset.focalPoint);

    for (const asset of withoutFocal) {
      expect(resolveEditorialAsset(asset.id).objectPosition).toBe('50% 50%');
    }
  });

  describe('desktop and mobile selection', () => {
    it('offers the phone crop only when that file exists too', () => {
      placeFile(EDITORIAL_ASSETS.hero.desktopSrc);

      const resolved = resolveEditorialAsset('hero');

      expect(resolved.available).toBe(true);
      // A HALF-DELIVERED PAIR degrades to the desktop file at every width,
      // rather than pointing phones at a 404.
      expect(resolved.mobileSrc).toBeNull();
    });

    it('offers both crops when both files exist', () => {
      const { desktopSrc, mobileSrc } = EDITORIAL_ASSETS.hero;
      if (mobileSrc === undefined) throw new Error('the hero is expected to declare a phone crop');

      placeFile(desktopSrc);
      placeFile(mobileSrc);

      const resolved = resolveEditorialAsset('hero');

      expect(resolved.desktopSrc).toBe(desktopSrc);
      expect(resolved.mobileSrc).toBe(mobileSrc);
    });

    it('never reports a phone crop for an asset that declares none', () => {
      placeFile(EDITORIAL_ASSETS.atelier.desktopSrc);

      expect(resolveEditorialAsset('atelier').mobileSrc).toBeNull();
    });
  });
});

describe('missingEditorialAssets', () => {
  it('lists everything that has not been delivered yet', () => {
    expect(missingEditorialAssets()).toHaveLength(EDITORIAL_ASSET_LIST.length);
  });

  it('drops an asset from the list once its file arrives', () => {
    placeFile(EDITORIAL_ASSETS.bridal.desktopSrc);

    const missing = missingEditorialAssets().map((asset) => asset.id);

    expect(missing).not.toContain('bridal');
    expect(missing).toHaveLength(EDITORIAL_ASSET_LIST.length - 1);
  });
});
