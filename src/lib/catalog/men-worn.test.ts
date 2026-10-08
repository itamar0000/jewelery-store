import { describe, expect, it } from 'vitest';

import type { ProductCardData } from '@/components/product/types';
import { fromShekels } from '@/lib/money';

import { forMenDepartment } from './men-worn';

const card = (slug: string): ProductCardData => ({
  id: slug,
  slug,
  name: 'צמיד',
  price: fromShekels(1000),
  hoverImageUrl: 'https://media.example/woman.jpg',
  hoverImageAlt: 'על יד של אישה',
});

describe('forMenDepartment', () => {
  it('shows a unisex piece worn by a man', () => {
    expect(forMenDepartment(card('chain-bracelet')).hoverImageUrl).toBe(
      '/images/men-worn/chain-bracelet.jpg',
    );
  });

  it('matches the starter slugs production still carries', () => {
    expect(forMenDepartment(card('demo-rope-bracelet')).hoverImageUrl).toBe(
      '/images/men-worn/rope-bracelet.jpg',
    );
  });

  it('leaves any other piece as it is', () => {
    const signet = card('signet-ring');
    expect(forMenDepartment(signet)).toBe(signet);
  });
});
