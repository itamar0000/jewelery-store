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
  it('never labels an image, whatever its simulation flag says (owner decision, D4D.40)', () => {
    const markup = renderToStaticMarkup(
      <ProductGallery images={[photo('worn', true), photo('main')]} productName="טבעת" />,
    );
    expect(markup).not.toContain('הדמיה');
  });
});
