import { describe, expect, it } from 'vitest';

import type { ProductDetail } from '@/lib/catalog/types';

import { jsonLdText, organizationJsonLd, productJsonLd } from './structured-data';

const product = {
  slug: 'aurora-ring',
  nameHe: 'טבעת אורורה',
  shortDescriptionHe: 'טבעת סוליטר.',
  descriptionHe: 'ארוך יותר.',
  category: { nameHe: 'טבעות אירוסין' },
  priceRange: { min: 489000, max: 589000 },
  variants: [{ images: [{ url: 'https://cdn.example/b.jpg' }] }, { images: [] }],
  images: [{ url: 'https://cdn.example/a.jpg' }, { url: null }],
} as unknown as ProductDetail;

describe('structured data', () => {
  it('describes the shop as an organisation and a website', () => {
    const data = organizationJsonLd('https://shop.example') as { '@graph': { '@type': string }[] };
    expect(data['@graph'].map((node) => node['@type'])).toEqual(['Organization', 'WebSite']);
  });

  it('leaves the price out while prices are estimates', () => {
    const data = productJsonLd(product, { origin: 'https://shop.example', pricesFinal: false });
    expect(data.offers).toBeUndefined();
    expect(data.image).toEqual(['https://cdn.example/a.jpg', 'https://cdn.example/b.jpg']);
  });

  it('states the price range in shekels once prices are final', () => {
    const data = productJsonLd(product, { origin: 'https://shop.example', pricesFinal: true });
    expect(data.offers).toMatchObject({
      '@type': 'AggregateOffer',
      priceCurrency: 'ILS',
      lowPrice: 4890,
      highPrice: 5890,
    });
  });

  it('cannot close the script tag it sits in', () => {
    expect(jsonLdText({ name: '</script><b>' })).not.toContain('</script>');
  });
});
