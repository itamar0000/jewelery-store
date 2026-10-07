import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { ResolvedImage } from '@/lib/catalog/images';

import { ProductGallery } from './ProductGallery';

const photo = (id: string, isSimulation = false): ResolvedImage => ({
  id,
  url: null,
  altHe: `תמונה ${id}`,
  width: null,
  height: null,
  isPrimary: id === 'main',
  isSimulation,
  variantId: null,
});

describe('ProductGallery', () => {
  it('labels a generated image as one', () => {
    const markup = renderToStaticMarkup(
      <ProductGallery images={[photo('worn', true), photo('main')]} productName="טבעת" />,
    );
    expect(markup).toContain('הדמיה');
  });

  it('says nothing over a photograph of the piece', () => {
    const markup = renderToStaticMarkup(
      <ProductGallery images={[photo('main'), photo('worn', true)]} productName="טבעת" />,
    );
    expect(markup).not.toContain('>הדמיה<');
  });
});
