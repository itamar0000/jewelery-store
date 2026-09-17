import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';

import { EDITORIAL_ASSETS, type EditorialAssetId } from '@/lib/content/editorial-assets';
import {
  hideEditorialFile,
  placeEditorialFile,
  restoreEditorialFiles,
} from '@/test/editorial-files';

import { EditorialImage } from './EditorialImage';

/**
 * Rendered with `react-dom/server`, following src/lib/rtl/bidi.test.tsx: the
 * contract is the emitted markup, so no DOM is needed.
 *
 * Availability comes from the filesystem, so the tests that need a delivered
 * asset write one and remove it again. The fixtures live in
 * `@/test/editorial-files`, which also explains why they have to stash any real
 * photography rather than simply deleting what they find.
 */
/**
 * Forces an asset back to its undelivered state for one test.
 *
 * The mirror image of `deliver`, and just as necessary. These tests were
 * written while `public/images/editorial/` was empty, so "not delivered" was
 * simply the ambient condition and nothing had to arrange it. Once real
 * photography landed, every assertion about the placeholder branch was silently
 * testing the delivered branch instead - and failing, which is the good outcome;
 * had the assertions been looser they would have passed while testing nothing.
 */
function undeliver(id: EditorialAssetId): void {
  const asset = EDITORIAL_ASSETS[id];
  hideEditorialFile(asset.desktopSrc);
  if (asset.mobileSrc) hideEditorialFile(asset.mobileSrc);
}

function deliver(id: EditorialAssetId, options: { readonly mobile?: boolean } = {}): void {
  const asset = EDITORIAL_ASSETS[id];
  const sources = [
    asset.desktopSrc,
    ...(options.mobile && asset.mobileSrc ? [asset.mobileSrc] : []),
  ];

  for (const src of sources) placeEditorialFile(src);
}

afterEach(restoreEditorialFiles);

function render(node: ReactElement): string {
  return renderToStaticMarkup(node);
}

describe('EditorialImage', () => {
  describe('when the file has not been delivered', () => {
    /**
     * THE DEFAULT STATE OF THIS SYSTEM TODAY, and the reason the placeholder
     * has to be unmistakable: a reviewer looking at the homepage must be able
     * to tell "the photograph is pending" from "the design is a beige box".
     */
    it('renders the development placeholder, not a broken image', () => {
      undeliver('hero');

      const markup = render(<EditorialImage id="hero" sizes="100vw" />);

      expect(markup).not.toContain('<img');
      expect(markup).toContain('Editorial image placeholder');
    });

    it('captions the placeholder with what belongs there', () => {
      undeliver('category-rings');

      const markup = render(
        <EditorialImage id="category-rings" sizes="50vw" placeholderLabel="טבעות" />,
      );

      expect(markup).toContain('טבעות');
    });

    it('falls back to the shot brief when the caller names nothing', () => {
      undeliver('atelier');

      const markup = render(<EditorialImage id="atelier" sizes="50vw" />);

      expect(markup).toContain('Craftsmanship');
    });

    it('can hide the caption where text sits over the image', () => {
      undeliver('hero');

      const markup = render(
        <EditorialImage
          id="hero"
          sizes="100vw"
          placeholderLabel="תמונת נושא"
          hidePlaceholderLabel
        />,
      );

      expect(markup).not.toContain('תמונת נושא');

      /*
       * THE MARKER SURVIVES. Suppressing it too is what produced the
       * near-invisible cream plane behind the hero headline that the brief
       * calls out: a full-bleed placeholder with nothing on it is
       * indistinguishable from a design decision.
       */
      expect(markup).toContain('Editorial image placeholder');
    });
  });

  describe('when the file has been delivered', () => {
    it('renders an optimized image', () => {
      // Asserts the BEFORE state as well as the after, so the arrangement has
      // to start from a genuinely undelivered asset.
      undeliver('atelier');

      const markup = render(<EditorialImage id="atelier" sizes="50vw" />);
      expect(markup).not.toContain('<img');

      deliver('atelier');
      const delivered = render(<EditorialImage id="atelier" sizes="50vw" />);

      expect(delivered).toContain('<img');
      expect(delivered).toContain('/_next/image?url=');
      expect(delivered).toContain('sizes="50vw"');
    });

    /**
     * ONE ELEMENT, ONE DOWNLOAD.
     *
     * The earlier version stacked two <img> elements and toggled them with
     * `md:hidden`, which downloads both crops of the hero - the single most
     * expensive image on the site. <picture> lets the browser choose, so the
     * assertion is that exactly one <img> is emitted alongside the <source>.
     */
    it('offers the phone crop as a <source> rather than a second image', () => {
      deliver('hero', { mobile: true });

      const markup = render(<EditorialImage id="hero" sizes="100vw" priority />);

      expect(markup.match(/<img/g)).toHaveLength(1);
      // `<` is escaped in the serialized attribute.
      expect(markup).toContain('<source media="(width &lt; 48rem)"');
      expect(markup).toContain('hero-mobile.jpg');
      expect(markup).toContain('hero-desktop.jpg');
    });

    it('emits no <source> when only the desktop file has arrived', () => {
      // The phone crop is a real file now, so a half-delivered pair has to be
      // arranged rather than assumed.
      undeliver('hero');
      deliver('hero');

      const markup = render(<EditorialImage id="hero" sizes="100vw" priority />);

      expect(markup).not.toContain('<source');
      expect(markup).toContain('hero-desktop.jpg');
      expect(markup).not.toContain('hero-mobile.jpg');
    });

    it('carries both focal points as custom properties', () => {
      deliver('hero', { mobile: true });

      const markup = render(<EditorialImage id="hero" sizes="100vw" />);

      expect(markup).toContain('--editorial-focal-desktop:35% 40%');
      expect(markup).toContain('--editorial-focal-mobile:50% 32%');
      expect(markup).toContain('class="editorial-focal');
    });

    describe('loading', () => {
      it('defers everything below the fold', () => {
        deliver('bridal');

        expect(render(<EditorialImage id="bridal" sizes="100vw" />)).toContain('loading="lazy"');
      });

      it('loads the priority image eagerly and at high fetch priority', () => {
        deliver('hero', { mobile: true });

        const markup = render(<EditorialImage id="hero" sizes="100vw" priority />);

        expect(markup).toContain('loading="eager"');
        expect(markup).toContain('fetchPriority="high"');
      });

      /**
       * `next/image`'s own `priority` preloads every source it knows about,
       * which for an art-directed pair means preloading BOTH hero crops and
       * downloading the one the browser then discards.
       */
      it('does not preload a source the browser may not choose', () => {
        deliver('hero', { mobile: true });

        expect(render(<EditorialImage id="hero" sizes="100vw" priority />)).not.toContain(
          'rel="preload"',
        );
      });
    });

    describe('alt text', () => {
      it('describes an image that carries meaning', () => {
        deliver('diamonds');

        expect(render(<EditorialImage id="diamonds" sizes="50vw" />)).toContain(
          `alt="${EDITORIAL_ASSETS.diamonds.alt}"`,
        );
      });

      /**
       * An empty alt is what hides a DECORATIVE image from a screen reader.
       * Omitting the attribute entirely would instead make assistive technology
       * announce the filename, which is worse than saying nothing.
       */
      it('emits an empty alt - not a missing one - for a decorative image', () => {
        deliver('category-rings');

        const markup = render(<EditorialImage id="category-rings" sizes="50vw" />);

        expect(markup).toContain('alt=""');
      });
    });
  });
});
