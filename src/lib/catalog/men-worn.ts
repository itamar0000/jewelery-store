import type { ProductCardData } from '@/components/product/types';

/**
 * A man wearing the piece, for the men's department's cards (D4D.34).
 *
 * A UNISEX PIECE KEEPS ITS OWN PHOTOGRAPHS. The link bracelet's second image
 * is a woman wearing it, which is right in "צמידים" and wrong in "צמידים
 * לגבר"; changing the product's images would make it wrong in the other
 * place. So inside the men's department - and only there - a card's hover
 * frame is the piece worn by a man.
 *
 * STATIC FILES, NOT PRODUCT IMAGES. They ship with the site, so they need no
 * storage upload and cannot leak into a gallery, a cart line or a search
 * result. Each was generated from the piece's own packshot (fal, flux-2-pro
 * edit), hands and neck only, no face.
 *
 * A piece made for men, with its own men's photographs, needs no entry.
 */
const MEN_WORN: Readonly<Record<string, { src: string; alt: string }>> = {
  'chain-necklace': {
    src: '/images/men-worn/chain-necklace.jpg',
    alt: 'שרשרת חוליות זהב על צוואר של גבר (הדמיה)',
  },
  'bar-necklace': {
    src: '/images/men-worn/bar-necklace.jpg',
    alt: 'שרשרת בר זהב על צוואר של גבר (הדמיה)',
  },
  'chain-bracelet': {
    src: '/images/men-worn/chain-bracelet.jpg',
    alt: 'צמיד חוליות זהב על פרק כף יד של גבר (הדמיה)',
  },
  'rope-bracelet': {
    src: '/images/men-worn/rope-bracelet.jpg',
    alt: 'צמיד חבל זהב על פרק כף יד של גבר (הדמיה)',
  },
};

/** Production still carries the starter slugs with a "demo-" prefix. */
function baseSlug(slug: string): string {
  return slug.replace(/^demo-/, '');
}

/** The card as the men's department shows it. */
export function forMenDepartment(card: ProductCardData): ProductCardData {
  const worn = MEN_WORN[baseSlug(card.slug)];
  return worn ? { ...card, hoverImageUrl: worn.src, hoverImageAlt: worn.alt } : card;
}
