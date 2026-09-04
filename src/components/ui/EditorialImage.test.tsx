import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';

import { EDITORIAL_ASSETS, type EditorialAssetId } from '@/lib/content/editorial-assets';

import { EditorialImage } from './EditorialImage';

/**
 * Rendered with `react-dom/server`, following src/lib/rtl/bidi.test.tsx: the
 * contract is the emitted markup, so no DOM is needed.
 *
 * Availability comes from the filesystem, so the tests that need a delivered
 * asset write one and remove it again - see editorial-assets.test.ts for why
 * empty files are enough.
 */
const created: string[] = [];

function deliver(id: EditorialAssetId, options: { readonly mobile?: boolean } = {}): void {
  const asset = EDITORIAL_ASSETS[id];
  const sources = [
    asset.desktopSrc,
    ...(options.mobile && asset.mobileSrc ? [asset.mobileSrc] : []),
  ];

  for (const src of sources) {
    const onDisk = path.join(process.cwd(), 'public', src.replace(/^\/+/, ''));
    mkdirSync(path.dirname(onDisk), { recursive: true });
    writeFileSync(onDisk, '');
    created.push(onDisk);
  }
}

afterEach(() => {
  for (const file of created) rmSync(file, { force: true });
  created.length = 0;
});

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
      const markup = render(<EditorialImage id="hero" sizes="100vw" />);

      expect(markup).not.toContain('<img');
      expect(markup).toContain('Editorial image placeholder');
    });

    it('captions the placeholder with what belongs there', () => {
      const markup = render(
        <EditorialImage id="category-rings" sizes="50vw" placeholderLabel="טבעות" />,
      );

      expect(markup).toContain('טבעות');
    });

    it('falls back to the shot brief when the caller names nothing', () => {
      const markup = render(<EditorialImage id="atelier" sizes="50vw" />);

      expect(markup).toContain('Craftsmanship');
    });

    it('can hide the caption where text sits over the image', () => {
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
