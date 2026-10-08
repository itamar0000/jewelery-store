import { describe, expect, it } from 'vitest';

import { allInCategoryLabel } from './category-labels';

describe('allInCategoryLabel', () => {
  it('prefixes a kind of jewellery with "כל ה"', () => {
    expect(allInCategoryLabel('rings', 'טבעות')).toBe('כל הטבעות');
  });

  it('words the men’s department for its pieces, not its wearers', () => {
    expect(allInCategoryLabel('men', 'גברים')).toBe('כל התכשיטים לגבר');
  });
});
