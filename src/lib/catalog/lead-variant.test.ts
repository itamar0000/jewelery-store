import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db', () => ({ prisma: {} }));

import { leadVariantId } from './queries';

const shared = [{ storageKey: 'p/yellow-main.jpg' }, { storageKey: 'p/detail.jpg' }];

describe('leadVariantId', () => {
  it('is the first variant that holds the card photograph', () => {
    expect(
      leadVariantId(shared, [
        { id: 'rose', images: [{ storageKey: 'p/rose-main.jpg' }] },
        { id: 'yellow', images: [{ storageKey: 'p/yellow-main.jpg' }] },
      ]),
    ).toBe('yellow');
  });

  it('is null when no variant holds it, or there is no photograph', () => {
    expect(leadVariantId(shared, [{ id: 'rose', images: [] }])).toBeNull();
    expect(leadVariantId([], [{ id: 'rose', images: [] }])).toBeNull();
  });
});
