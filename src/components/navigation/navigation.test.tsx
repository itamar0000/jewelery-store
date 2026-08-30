import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { Breadcrumbs } from '@/components/category/Breadcrumbs';
import { SubcategoryNav } from '@/components/category/SubcategoryNav';
import { PRIMARY_NAV } from '@/lib/navigation/taxonomy';

import { MegaMenu } from './MegaMenu';

/**
 * Accessibility and RTL contracts for the navigation surfaces.
 *
 * Scope note: DesktopNav, MobileNav and Header are client components whose
 * behaviour lives in the reducer, which is tested directly in
 * src/lib/navigation/menu-state.test.ts. What is asserted HERE is the markup
 * contract of the presentational pieces - landmarks, labels, current-page
 * state, and directional icon handling - because those are the parts a
 * refactor silently drops.
 */
const RINGS = PRIMARY_NAV.find((item) => item.id === 'rings')!;

describe('MegaMenu', () => {
  const markup = renderToStaticMarkup(<MegaMenu item={RINGS} labelledBy="trigger-rings" />);

  it('is labelled by its trigger, so the panel announces which menu it is', () => {
    expect(markup).toContain('aria-labelledby="trigger-rings"');
  });

  it('renders every subcategory link from the taxonomy', () => {
    for (const link of RINGS.columns?.[0]?.links ?? []) {
      expect(markup).toContain(`href="${link.href}"`);
      expect(markup).toContain(link.label);
    }
  });

  it('renders the column heading as a heading element, not styled text', () => {
    expect(markup).toContain('<h3');
  });

  it('uses lists for link groups, so counts are announced', () => {
    expect(markup).toContain('<ul');
    expect(markup).toContain('<li');
  });
});

describe('Breadcrumbs', () => {
  const markup = renderToStaticMarkup(
    <Breadcrumbs trail={[{ label: 'דף הבית', href: '/' }, { label: 'טבעות' }]} />,
  );

  it('is a labelled navigation landmark', () => {
    expect(markup).toContain('<nav');
    expect(markup).toContain('aria-label="מסלול ניווט"');
  });

  it('uses an ordered list, because the order is the meaning', () => {
    expect(markup).toContain('<ol');
  });

  it('marks the final crumb as the current page', () => {
    expect(markup).toContain('aria-current="page"');
  });

  it('does not link the final crumb', () => {
    // Exactly one link: the home crumb.
    expect(markup.match(/<a /g)?.length).toBe(1);
  });

  it('mirrors the separator chevron for RTL', () => {
    // A separator that points the wrong way reads as a back arrow in Hebrew.
    expect(markup).toContain('icon-directional');
  });

  it('hides the separator from assistive technology', () => {
    expect(markup).toContain('aria-hidden="true"');
  });
});

describe('SubcategoryNav', () => {
  const links = [
    { id: 'rings-all', label: 'כל הטבעות', href: '/rings' },
    { id: 'rings-engagement', label: 'טבעות אירוסין', href: '/rings/engagement' },
  ];

  it('renders subcategories as links, not buttons', () => {
    // Section 8: these are navigation, not filters. A button would break
    // open-in-new-tab and hide them from the links list.
    const markup = renderToStaticMarkup(<SubcategoryNav links={links} />);

    expect(markup).toContain('href="/rings/engagement"');
    expect(markup).not.toContain('<button');
  });

  it('marks the active subcategory as the current page', () => {
    const markup = renderToStaticMarkup(<SubcategoryNav links={links} activeId="rings-all" />);
    expect(markup).toContain('aria-current="page"');
  });

  it('is a labelled navigation landmark', () => {
    const markup = renderToStaticMarkup(<SubcategoryNav links={links} />);
    expect(markup).toContain('aria-label="תת-קטגוריות"');
  });

  it('renders nothing when there are no subcategories', () => {
    expect(renderToStaticMarkup(<SubcategoryNav links={[]} />)).toBe('');
  });
});
