import type { ProductDetail } from '@/lib/catalog/types';
import { SITE_NAME } from '@/lib/config/site';

/**
 * schema.org structured data (JSON-LD), so a search result and a shared link can
 * show what the page is: the shop, and each piece with its photograph.
 *
 * PRICES ARE LEFT OUT WHILE THEY ARE ESTIMATES. A price in structured data is a
 * price a search engine shows beside the result, and while PRICES_FINAL is false
 * the figures are placeholders (PRODUCT.md, principle 1). The offer appears only
 * when the owner has said the prices are real.
 *
 * Pure functions, so they are tested without a request.
 */

type JsonLd = Record<string, unknown>;

export function organizationJsonLd(origin: string): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${origin}/#organization`,
        name: SITE_NAME,
        url: origin,
        description: 'תכשיטי זהב 14K ויהלומים, מיוצרים בישראל בהזמנה.',
      },
      {
        '@type': 'WebSite',
        '@id': `${origin}/#website`,
        url: origin,
        name: SITE_NAME,
        inLanguage: 'he-IL',
        publisher: { '@id': `${origin}/#organization` },
      },
    ],
  };
}

export function productJsonLd(
  product: ProductDetail,
  options: { origin: string; pricesFinal: boolean },
): JsonLd {
  const { origin, pricesFinal } = options;
  const images = [...product.images, ...product.variants.flatMap((variant) => variant.images)]
    .map((image) => image.url)
    .filter((url): url is string => typeof url === 'string' && url.length > 0);
  const unique = [...new Set(images)].slice(0, 6);

  const data: JsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${origin}/product/${product.slug}#product`,
    name: product.nameHe,
    url: `${origin}/product/${product.slug}`,
    brand: { '@type': 'Brand', name: SITE_NAME },
    category: product.category.nameHe,
    ...(product.shortDescriptionHe || product.descriptionHe
      ? { description: (product.shortDescriptionHe ?? product.descriptionHe) as string }
      : {}),
    ...(unique.length > 0 ? { image: unique } : {}),
  };

  if (pricesFinal) {
    const low = Number(product.priceRange.min) / 100;
    const high = Number(product.priceRange.max) / 100;
    data.offers =
      low === high
        ? {
            '@type': 'Offer',
            priceCurrency: 'ILS',
            price: low,
            availability: 'https://schema.org/PreOrder',
            itemCondition: 'https://schema.org/NewCondition',
          }
        : {
            '@type': 'AggregateOffer',
            priceCurrency: 'ILS',
            lowPrice: low,
            highPrice: high,
            offerCount: product.variants.length,
            availability: 'https://schema.org/PreOrder',
            itemCondition: 'https://schema.org/NewCondition',
          };
  }

  return data;
}

/** A JSON-LD object as the text of a script tag, safe to embed in HTML. */
export function jsonLdText(data: JsonLd): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
