import { afterEach, describe, expect, it } from 'vitest';

import {
  EDITORIAL_ASSETS,
  EDITORIAL_ASSET_LIST,
  missingEditorialAssets,
  resolveEditorialAsset,
  type EditorialAssetId,
} from './editorial-assets';
import {
  hideEditorialFile,
  placeEditorialFile,
  restoreEditorialFiles,
} from '@/test/editorial-files';

/**
 * Availability is decided by the filesystem, so the tests that cover it have to
 * touch the filesystem. Files are written under `public/` - the only place
 * `resolveEditorialAsset` looks - and removed again in `afterEach`, including
 * when the assertion throws.
 *
 * Real bytes are not needed: nothing here decodes the image. What is under test
 * is the presence check and everything it drives.
 */
const placeFile = placeEditorialFile;
const hideFile = hideEditorialFile;

afterEach(restoreEditorialFiles);

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

  /**
   * `mobileSrc` and `master.mobile` are one decision recorded twice, so they
   * are exactly the kind of pair that drifts. If a phone crop is added to the
   * registry without a master size, the prepare script silently writes nothing
   * for it and the storefront falls back to the desktop file - a regression
   * that looks like a bad crop rather than a missing step.
   */
  it('declares a mobile master exactly when it declares a mobile source', () => {
    for (const asset of EDITORIAL_ASSET_LIST) {
      expect(asset.master.mobile !== undefined).toBe(asset.mobileSrc !== undefined);
    }
  });

  it('gives every master a positive, landscape-or-portrait size', () => {
    for (const asset of EDITORIAL_ASSET_LIST) {
      for (const size of [asset.master.desktop, asset.master.mobile]) {
        if (!size) continue;
        expect(size.width).toBeGreaterThan(0);
        expect(size.height).toBeGreaterThan(0);
        // Guards a transposed pair: nothing here is a 10:1 letterbox.
        expect(size.width / size.height).toBeGreaterThan(0.3);
        expect(size.width / size.height).toBeLessThan(4);
      }
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
    // Forced absent: with real photography delivered this asset HAS a file,
    // and the branch under test would never be reached.
    hideFile(EDITORIAL_ASSETS['category-rings'].desktopSrc);

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
      const { desktopSrc, mobileSrc } = EDITORIAL_ASSETS.hero;
      if (mobileSrc === undefined) throw new Error('the hero is expected to declare a phone crop');

      // The point of the test is a HALF-delivered pair, so the phone crop has
      // to be absent even once the real one has been delivered.
      hideFile(mobileSrc);
      placeFile(desktopSrc);

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
  /**
   * COUNTED AGAINST THE DISK, NOT AGAINST A FIXED NUMBER.
   *
   * These two assertions used to read `toHaveLength(EDITORIAL_ASSET_LIST.length)`
   * and `length - 1`, which quietly encoded "no photography has been delivered
   * yet" as an invariant of the project. True on the day they were written;
   * false forever after the first real asset landed, and the failure pointed at
   * the registry rather than at the assumption.
   *
   * The real contract has nothing to do with how many files exist: an asset is
   * listed exactly when its file is not on disk.
   */
  it('lists exactly the assets whose files are not on disk', () => {
    const missing = new Set(missingEditorialAssets().map((asset) => asset.id));

    for (const asset of EDITORIAL_ASSET_LIST) {
      expect(missing.has(asset.id)).toBe(!resolveEditorialAsset(asset.id).available);
    }
  });

  it('drops an asset from the list once its file arrives', () => {
    const { desktopSrc, mobileSrc } = EDITORIAL_ASSETS.bridal;

    // Start from a known state rather than whatever the working tree happens
    // to hold, so the test measures the transition it is named after.
    hideFile(desktopSrc);
    if (mobileSrc) hideFile(mobileSrc);

    const before = missingEditorialAssets().map((asset) => asset.id);
    expect(before).toContain('bridal');

    placeFile(desktopSrc);

    const after = missingEditorialAssets().map((asset) => asset.id);

    expect(after).not.toContain('bridal');
    expect(after).toHaveLength(before.length - 1);
  });
});
