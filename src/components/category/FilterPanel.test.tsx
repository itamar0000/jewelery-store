import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import {
  normalizeCatalogQuery,
  parseCatalogSearchParams,
  type Facet,
  type SearchParams,
} from '@/lib/catalog/filters';

import { FilterBar } from './FilterPanel';
import { Pagination } from './Pagination';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: () => {} }),
}));

const COLOUR: Facet = {
  code: 'gold_color',
  param: 'goldColor',
  source: 'option',
  labelHe: 'גוון זהב',
  values: [
    { value: 'WHITE', token: 'white', labelHe: 'זהב לבן', hexColor: '#E8E8E6' },
    { value: 'YELLOW', token: 'yellow', labelHe: 'זהב צהוב', hexColor: '#E5C06B' },
    { value: 'ROSE', token: 'rose', labelHe: 'זהב אדום', hexColor: '#E0B5A8' },
  ],
};

function render(params: SearchParams, productCount: number) {
  const query = normalizeCatalogQuery(parseCatalogSearchParams(params), [COLOUR]);
  return renderToStaticMarkup(
    <FilterBar
      facets={[COLOUR]}
      query={query}
      basePath="/rings"
      productCount={productCount}
      counts={{ gold_color: { WHITE: 10, YELLOW: 4, ROSE: 0 } }}
    />,
  );
}

/** The markup of the row carrying `label`, from its opening tag to the label. */
function row(markup: string, label: string): string {
  const end = markup.indexOf(label);
  const start = markup.lastIndexOf('<li', end);
  return markup.slice(start, markup.indexOf('</li>', end));
}

describe('FilterBar', () => {
  // A group with a selection opens on arrival, so its values are in the markup.
  const markup = render({ goldColor: 'white' }, 10);

  it('says how many products each value leads to, aloud as well as on screen', () => {
    expect(row(markup, 'זהב צהוב')).toMatch(/tabular-nums">4<\/span>/);
    expect(row(markup, 'זהב צהוב')).toContain('4 מוצרים, הוספה לסינון');
    expect(row(markup, 'זהב לבן')).toContain('10 מוצרים, הסרת הסינון');
  });

  it('shows a value with nothing to show, but does not offer it as a link', () => {
    const rose = row(markup, 'זהב אדום');

    expect(rose).not.toContain('<a');
    expect(rose).toContain('אין מוצרים מתאימים לבחירה הנוכחית');
  });

  it('keeps a chosen value a link even at zero, so it can always be cleared', () => {
    const query = normalizeCatalogQuery(parseCatalogSearchParams({ goldColor: 'rose' }), [COLOUR]);
    const chosen = renderToStaticMarkup(
      <FilterBar
        facets={[COLOUR]}
        query={query}
        basePath="/rings"
        productCount={0}
        counts={{ gold_color: { WHITE: 10, YELLOW: 4, ROSE: 0 } }}
      />,
    );

    expect(row(chosen, 'זהב אדום')).toContain('<a');
  });

  it('counts in Hebrew: the one is named, not numbered', () => {
    const one = render({ goldColor: 'white' }, 1);

    expect(one).toContain('מוצר אחד');
    expect(one).toContain('מסנן פעיל אחד');
    expect(one).not.toContain('1 מוצרים');
    expect(one).not.toContain('1 מסננים');
  });

  it('says why there is no colour, karat, size or length filter', () => {
    expect(markup).toContain('אין צורך לסנן לפי גוון זהב, קראט, מידה או אורך');
  });

  it('marks the top of the results, where a new page starts', () => {
    expect(markup).toMatch(/<div id="results"/);
  });
});

describe('Pagination', () => {
  it('sends every page to the top of the results', () => {
    const query = normalizeCatalogQuery(parseCatalogSearchParams({}), []);
    const markup = renderToStaticMarkup(
      <Pagination query={query} basePath="/rings" page={1} totalPages={3} />,
    );

    expect(markup).toContain('href="/rings?page=2#results"');
    expect(markup).toContain('href="/rings#results"');
  });
});
