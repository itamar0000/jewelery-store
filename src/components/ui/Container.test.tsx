import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { Container } from './Container';

describe('Container (A11Y-1)', () => {
  it('passes aria-labelledby through, so the section is a named region', () => {
    const markup = renderToStaticMarkup(
      <Container as="section" aria-labelledby="faq-heading">
        <h2 id="faq-heading">שאלות</h2>
      </Container>,
    );
    expect(markup).toContain('<section aria-labelledby="faq-heading"');
  });

  it('passes an id through', () => {
    expect(renderToStaticMarkup(<Container id="x">a</Container>)).toContain('id="x"');
  });
});
