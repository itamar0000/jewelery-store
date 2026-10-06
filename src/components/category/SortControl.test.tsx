import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { normalizeCatalogQuery, parseCatalogSearchParams } from '@/lib/catalog/filters';

import { SortControl } from './SortControl';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: () => {} }),
}));

function render(params: Record<string, string>) {
  const query = normalizeCatalogQuery(parseCatalogSearchParams(params), []);
  return renderToStaticMarkup(<SortControl query={query} basePath="/rings" />);
}

/**
 * "הכי רלוונטי" ranks results against a search term. On a category page there
 * is none, so the option changed nothing and was offered anyway.
 */
describe('SortControl', () => {
  it('offers no relevance sort on a category page', () => {
    const markup = render({});

    expect(markup).not.toContain('הכי רלוונטי');
    expect(markup).toContain('מומלץ');
  });

  it('offers it where there is a search term', () => {
    expect(render({ q: 'טבעת' })).toContain('הכי רלוונטי');
  });

  it('reads a category URL asking for relevance as the default sort', () => {
    const markup = render({ sort: 'relevance' });

    expect(markup).not.toContain('הכי רלוונטי');
    expect(markup).toMatch(/<option value="recommended" selected="">/);
  });
});
